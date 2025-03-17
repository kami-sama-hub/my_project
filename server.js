const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // 允许使用 .env 变量

const app = express();
const PORT = process.env.PORT || 3000; // 兼容 Render 端口
const MONGO_URI = process.env.MONGO_URI; // 从 .env 获取 MongoDB 地址

if (!MONGO_URI) {
    console.error("❌ 错误: MONGO_URI 未设置");
    process.exit(1);
}

// 连接 MongoDB Atlas
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB 连接成功'))
.catch(err => console.error('❌ MongoDB 连接失败:', err));

// 定义 Schema
const DeliverySchema = new mongoose.Schema({
    trackingNumber: { type: String, unique: true, required: true },
    status: { type: String, required: true },
    history: [{ status: String, updatedAt: Date }],
    updatedAt: { type: Date, default: Date.now },
});

const Delivery = mongoose.model('Delivery', DeliverySchema);

app.use(express.json());
app.use(cors());

// ✅ 添加快递信息或更新状态
app.post('/add', async (req, res) => {
    const { trackingNumber, status } = req.body;
    if (!trackingNumber || !status) return res.status(400).json({ message: "快递单号和状态不能为空" });

    try {
        let parcel = await Delivery.findOne({ trackingNumber });
        if (parcel) {
            parcel.status = status;
            parcel.history.push({ status, updatedAt: new Date() });
            parcel.updatedAt = new Date();
            await parcel.save();
            return res.json({ message: "快递状态已更新" });
        }

        const newParcel = new Delivery({ trackingNumber, status, history: [{ status, updatedAt: new Date() }] });
        await newParcel.save();
        res.json({ message: "快递信息添加成功" });
    } catch (err) {
        res.status(500).json({ message: "服务器错误" });
    }
});

// ✅ 获取所有快递信息（分页）
app.get('/deliveries', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const total = await Delivery.countDocuments();
        const parcels = await Delivery.find().skip(skip).limit(limit);
        res.json({ total, parcels });
    } catch (error) {
        res.status(500).json({ message: "服务器错误" });
    }
});

// ✅ 批量删除快递信息
app.post('/delete', async (req, res) => {
    const { trackingNumbers } = req.body;
    if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
        return res.status(400).json({ message: "请提供要删除的快递单号" });
    }

    try {
        await Delivery.deleteMany({ trackingNumber: { $in: trackingNumbers } });
        res.json({ message: "快递信息已删除" });
    } catch (error) {
        res.status(500).json({ message: "服务器错误" });
    }
});

// ✅ 服务器启动
app.listen(PORT, () => console.log(`🚀 服务器运行在 http://localhost:${PORT}`));
