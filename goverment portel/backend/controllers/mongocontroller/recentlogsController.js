const RecentLogs = require("../../model/mongomodel/RecentLogs");

const getMyRecentLogs = async (req, res) => {
    try {
        const user_id = req.user.user_id;

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: "User ID not found"
            });
        }

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const count = Math.max(parseInt(req.query.count) || 10, 1);

        const skip = (page - 1) * count;

        const logs = await RecentLogs.find(
            { user_id: user_id },
            {
                _id: 0,
                recent_activity: 1,
                username: 1,
                navigate_at: 1
            }
        )
            .sort({ navigate_at: -1 })
            .skip(skip)
            .limit(count);

        return res.status(200).json({
            success: true,
            page,
            count,
            data: logs
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    getMyRecentLogs
};