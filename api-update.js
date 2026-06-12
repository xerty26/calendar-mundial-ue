import syncCalendar from './cron-update.js';
export default async function handler(req, res) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        syncCalendar();

        return res.status(200).json({ success: true, message: 'Calendario actualizado' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}