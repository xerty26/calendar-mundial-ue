const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const simpleGit = require('simple-git');

const git = simpleGit();
const jsonUrl = 'https://www.marca.com/eventos/marcador/api/2025/0117/api-calendario-carga.json';

// Diccionario oficial de banderas por código FIFA
const diccionarioBanderas = {
    "114": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "115": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    "118": "🇪🇸",
    "357": "🇩🇪",
    "359": "🇵🇹",
    "360": "🇧🇪",
    "361": "🇸🇪",
    "362": "🇹🇷",
    "363": "🇳🇴",
    "366": "🇳🇱",
    "367": "🇨🇿",
    "368": "🇫🇷",
    "497": "🇨🇭",
    "515": "🇦🇹",
    "522": "🇿🇦",
    "535": "🇭🇷",
    "537": "🇧🇦",
    "575": "🇦🇺",
    "596": "🇺🇸",
    "597": "🇨🇦",
    "614": "🇧🇷",
    "632": "🇦🇷",
    "659": "🇲🇽",
    "830": "🇪🇨",
    "832": "🇨🇴",
    "835": "🇵🇾",
    "837": "🇺🇾",
    "1041": "🇰🇷",
    "1042": "🇮🇷",
    "1057": "🇲🇦",
    "1215": "🇩🇿",
    "1219": "🇬🇭",
    "1221": "🇨🇮",
    "1222": "🇨🇩",
    "1224": "🇹🇳",
    "1225": "🇪🇬",
    "1226": "🇸🇳",
    "1264": "🇸🇦",
    "1266": "🇯🇵",
    "1327": "🇭🇹",
    "1359": "🇺🇿",
    "1529": "🇨🇻",
    "1800": "🇮🇶",
    "1804": "🇳🇿",
    "1843": "🇯🇴",
    "1869": "🇵🇦",
    "1873": "🇶🇦",
    "6512": "🇨🇼",
};

async function consultaJson(url) {
    return fetch(url).then((function (e) {
        return e.json()
    }));
}

function formatearFechaICS(objetoDate) {
    return objetoDate.toISOString()
        .replace(/[-:]/g, "")
        .split(".")[0] + "Z";
}

function getUrlDirectoRedirect(eventMundial) {
    const urlNotices = 'https://www.marca.com/futbol/mundial.html?intcmp=MENUMIGA&s_kw=noticias';
    const otherUrls = eventMundial?.editorialInfo?.otherUrls || [];
    let urlLiveEditorial = '';

    if(eventMundial.sportEvent?.status?.id === 2) {
        urlLiveEditorial = otherUrls.find(url => url.tag === 'cronica') || eventMundial?.editorialInfo
    } else {
        urlLiveEditorial = otherUrls.find(url => url.tag === 'directo') || otherUrls.find(url => url.tag === 'cronica');
    }
    
    return urlLiveEditorial?.url || urlNotices;
}

function getSummary(partido) {
    if (partido.statusId === 2) {
        return `${partido.homeTeamFlag} ${partido.homeTeamName} ${partido.hometeamGoals}-${partido.awayTeamGoals} ${partido.awayTeamFlag} ${partido.awayTeamName}`;
    }

    return `${partido.homeTeamFlag} ${partido.homeTeamName} - ${partido.awayTeamFlag} ${partido.awayTeamName} | ${partido.tvChannel}`;
}

function getDescription(partido) {
    if (partido.statusId === 2) {
        return `🏆 ${diccionarioBanderas[partido.winnerTeam.id]} ${partido.winnerTeam.name} revisa las estadísticas en MARCA: ${partido.urlDirectoRedirect}`;
    }

    return `Sigue la narración en directo y el minuto a minuto en MARCA: ${partido.urlDirectoRedirect}`;
}

// ==========================================
// INIT CRON
// ==========================================
async function syncCalendar() {
    try {
        console.log('1. Consultando API de Deportes...');
        const partidosAPI = await consultaJson(jsonUrl);
        const partidosNormalizados = partidosAPI.map(eventMundial => {
            return {
                id: eventMundial.id,
                homeTeamId: eventMundial.sportEvent.competitors.homeTeam.id,
                homeTeamAbb: eventMundial.sportEvent.competitors.homeTeam.abbName,
                homeTeamName: eventMundial.sportEvent.competitors.homeTeam.commonName,
                homeTeamFlag: diccionarioBanderas[eventMundial.sportEvent.competitors.homeTeam.id] || "🔜",
                hometeamGoals: eventMundial.sportEvent?.status?.id === 2 ? eventMundial.score?.homeTeam?.totalScore : '',
                awayTeamGoals: eventMundial.sportEvent?.status?.id === 2 ? eventMundial.score?.awayTeam?.totalScore : '',
                awayTeam: eventMundial.sportEvent.competitors.awayTeam.name,
                awayTeamId: eventMundial.sportEvent.competitors.awayTeam.id,
                awayTeamAbb: eventMundial.sportEvent.competitors.awayTeam.abbName,
                awayTeamName: eventMundial.sportEvent.competitors.awayTeam.commonName,
                awayTeamFlag: diccionarioBanderas[eventMundial.sportEvent.competitors.awayTeam.id] || "🔜",
                inicio: formatearFechaICS(new Date(eventMundial.startDate)),
                fin: formatearFechaICS(new Date(new Date(eventMundial.startDate).getTime() + (2 * 60 * 60 * 1000))),
                urlDirectoRedirect: getUrlDirectoRedirect(eventMundial),
                location: eventMundial.sportEvent?.location?.name || 'Localización no disponible',
                tvChannel: eventMundial.tv?.[0]?.name || 'Marca Mundial 2026',
                statusId: eventMundial.sportEvent?.status?.id || 0,
                winnerTeam: eventMundial.sportEvent?.status?.id === 2 ? eventMundial.score?.winner : ''
            }
        });

        // 2. Cabeceras del archivo estático iCalendar
        let icsContenido = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Marca//Calendario Mundial Estatico//ES",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "X-WR-CALNAME:Mundial 2026 - MARCA Live",
            "X-PUBLISHED-TTL:PT1H",
            "REFRESH-INTERVAL;VALUE=DURATION:PT1H"
        ].join("\r\n") + "\r\n";

        // 3. Inyección de los partidos de la API
        partidosNormalizados.forEach(partido => {
            icsContenido += [
                "BEGIN:VEVENT",
                `UID:${partido.id}@marca.com`,
                `DTSTAMP:${partido.inicio}`,
                `DTSTART:${partido.inicio}`,
                `DTEND:${partido.fin}`,
                `SUMMARY:${getSummary(partido)}`,
                `DESCRIPTION:${getDescription(partido)}`,
                `URL;VALUE=URI:${partido.urlDirectoRedirect}`,
                `LOCATION:${partido.location}`,
                "BEGIN:VALARM",
                "TRIGGER:-PT15M",
                "ACTION:DISPLAY",
                "DESCRIPTION:Recordatorio de Partido",
                "END:VALARM",
                "END:VEVENT"
            ].join("\r\n") + "\r\n";
        });
        icsContenido += "END:VCALENDAR";

        const outputFile = path.join(path.resolve(), `public/calendar.ics`);
        fsSync.writeFileSync(outputFile, icsContenido, 'utf-8');
        console.log(`[${new Date().toISOString()}] ¡Calendario actualizado con éxito en el archivo ${outputFile}!`);

        
        // TODO: Cambiar por el cron
        console.log('🔄 Sincronizando con GitHub...');
        await git.add(outputFile);
        await git.commit(`Automated calendar update: ${new Date().toISOString()}`);
        await git.push('origin', 'main');
        console.log('🚀 ¡Cambio enviado a GitHub!');

    } catch (error) {
        console.error("❌ Error en el proceso:", error);
    }
}

syncCalendar();