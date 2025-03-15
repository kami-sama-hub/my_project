require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'secureKey', resave: false, saveUninitialized: true }));

// 连接 MongoDB
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

// 录入快递信息
app.post('/add', async (req, res) => {
    const { trackingNumber, status } = req.body;

    if (!trackingNumber || !status) {
        return res.status(400).json({ message: "快递单号和状态不能为空" });
    }

    try {
        const existingParcel = await Delivery.findOne({ trackingNumber });
        if (existingParcel) {
            return res.status(400).json({ message: "该快递单号已存在" });
        }

        const newParcel = new Delivery({ trackingNumber, status, history: [{ status, updatedAt: new Date() }] });
        await newParcel.save();
        res.json({ message: "快递信息添加成功" });
    } catch (err) {
        res.status(500).json({ message: "服务器错误" });
    }
});

// 获取所有快递信息
app.get('/deliveries', async (req, res) => {
    const parcels = await Delivery.find();
    res.json(parcels);
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
