require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'secureKey', resave: false, saveUninitialized: true }));

// 连接 MongoDB（云端数据库）
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Atlas 连接成功'))
.catch(err => console.error('❌ MongoDB 连接失败:', err));

const DeliverySchema = new mongoose.Schema({
    trackingNumber: { type: String, unique: true },
    status: String,
    history: [{ status: String, updatedAt: Date }],
    updatedAt: { type: Date, default: Date.now },
});

const Delivery = mongoose.model('Delivery', DeliverySchema);

// 查询快递
app.get('/track/:trackingNumber', async (req, res) => {
    const { trackingNumber } = req.params;
    const delivery = await Delivery.findOne({ trackingNumber });
    if (!delivery) return res.status(404).send('未找到快递信息');
    res.json(delivery);
});
// 查询快递历史记录
app.get('/history/:trackingNumber', async (req, res) => {
    const { trackingNumber } = req.params;
    const delivery = await Delivery.findOne({ trackingNumber });

    if (!delivery) return res.status(404).json({ error: '未找到快递历史' });

    res.json(delivery.history);
});

// 主页
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 后台管理
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => console.log(`🚀 服务器运行在 http://localhost:${PORT}`));
