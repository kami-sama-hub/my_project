require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON 请求
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// **🛡️ Session 设置**
app.use(session({
    secret: 'secureKey',
    resave: false,
    saveUninitialized: true
}));

// **🔗 连接 MongoDB**
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Atlas 连接成功'))
.catch(err => console.error('❌ MongoDB 连接失败:', err));

// **📦 定义快递数据模型**
const DeliverySchema = new mongoose.Schema({
    trackingNumber: { type: String, unique: true, required: true },
    status: { type: String, required: true },
    history: [{ status: String, updatedAt: Date }],
    updatedAt: { type: Date, default: Date.now },
});

const Delivery = mongoose.model('Delivery', DeliverySchema);

// **✅ 管理员账户（可以修改）**
const ADMIN_CREDENTIALS = {
    username: "admin",
    password: "admin123"
};

// **🔑 登录 API**
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        req.session.user = username;
        return res.json({ success: true });
    } else {
        return res.json({ success: false });
    }
});

// **🟢 检查是否已登录**
app.get('/check-login', (req, res) => {
    res.json({ loggedIn: !!req.session.user });
});

// **🔴 退出登录**
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

// **🔒 确保所有管理 API 需要管理员登录**
app.use((req, res, next) => {
    if (req.session.user || ["/", "/login", "/check-login", "/logout"].includes(req.path) || req.path.startsWith('/public')) {
        return next();
    }
    res.status(403).json({ message: "请先登录" });
});

// **📦 录入快递信息**
app.post('/add', async (req, res) => {
    const { trackingNumber, status } = req.body;

    if (!trackingNumber || !status) {
        return res.status(400).json({ message: "快递单号和状态不能为空" });
    }

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
        console.error("❌ 录入快递失败:", err);
        res.status(500).json({ message: "服务器错误" });
    }
});

// **📦 查询快递信息**
app.get('/track/:trackingNumber', async (req, res) => {
    try {
        const parcel = await Delivery.findOne({ trackingNumber: req.params.trackingNumber });
        if (!parcel) {
            return res.status(404).json({ message: "未找到快递信息" });
        }
        res.json(parcel);
    } catch (error) {
        console.error("❌ 查询快递失败:", error);
        res.status(500).json({ message: "服务器错误" });
    }
});

// **📜 获取快递物流历史**
app.get('/history/:trackingNumber', async (req, res) => {
    try {
        const parcel = await Delivery.findOne({ trackingNumber: req.params.trackingNumber });
        if (!parcel) {
            return res.status(404).json([]);
        }
        res.json(parcel.history);
    } catch (error) {
        console.error("❌ 获取物流历史失败:", error);
        res.status(500).json([]);
    }
});

// **📦 获取所有快递信息**
app.get('/deliveries', async (req, res) => {
    try {
        const parcels = await Delivery.find();
        res.json(parcels);
    } catch (error) {
        console.error("❌ 获取快递信息失败:", error);
        res.status(500).json({ message: "服务器错误" });
    }
});

// **🗑️ 删除快递信息**
app.delete('/delete/:trackingNumber', async (req, res) => {
    try {
        const { trackingNumber } = req.params;
        const result = await Delivery.findOneAndDelete({ trackingNumber });

        if (result) {
            res.json({ message: "快递信息已删除" });
        } else {
            res.status(404).json({ message: "未找到快递信息" });
        }
    } catch (error) {
        console.error("❌ 删除快递失败:", error);
        res.status(500).json({ message: "服务器错误" });
    }
});

// **🏠 主页**
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// **🔑 后台管理**
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// **🚀 监听端口**
app.listen(PORT, () => console.log(`🚀 服务器运行在 http://localhost:${PORT}`));
