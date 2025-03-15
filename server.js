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

// 连接 MongoDB（云端数据库）
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Atlas 连接成功'))
.catch(err => console.error('❌ MongoDB 连接失败:', err));

// 管理员账户（默认账号）
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

// 快递数据模型
const DeliverySchema = new mongoose.Schema({
    trackingNumber: { type: String, unique: true },
    status: String,
    history: [{ status: String, updatedAt: Date }],
    updatedAt: { type: Date, default: Date.now },
});

const Delivery = mongoose.model('Delivery', DeliverySchema);

// 📌 【1】管理员登录接口
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.user = username; // 设置 session
        return res.json({ success: true });
    } else {
        return res.json({ success: false, message: "用户名或密码错误" });
    }
});

// 📌 【2】退出登录
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 📌 【3】获取所有快递数据
app.get('/deliveries', async (req, res) => {
    const deliveries = await Delivery.find();
    res.json(deliveries);
});

// 📌 【4】新增快递
app.post('/add', async (req, res) => {
    const { trackingNumber, status } = req.body;
    try {
        const newParcel = new Delivery({ trackingNumber, status, history: [{ status, updatedAt: new Date() }] });
        await newParcel.save();
        res.send("快递信息已录入");
    } catch (error) {
        res.status(400).send("录入失败，请检查单号是否重复");
    }
});

// 📌 【5】删除快递
app.delete('/delete/:trackingNumber', async (req, res) => {
    await Delivery.deleteOne({ trackingNumber: req.params.trackingNumber });
    res.send("删除成功");
});

// 📌 【6】查询快递状态
app.get('/track/:trackingNumber', async (req, res) => {
    const delivery = await Delivery.findOne({ trackingNumber: req.params.trackingNumber });
    if (!delivery) return res.status(404).send('未找到快递信息');
    res.json(delivery);
});

// 📌 【7】查询快递历史
app.get('/history/:trackingNumber', async (req, res) => {
    const delivery = await Delivery.findOne({ trackingNumber: req.params.trackingNumber });
    if (!delivery) return res.status(404).json({ error: '未找到快递历史' });
    res.json(delivery.history);
});

// 📌 【8】主页
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 📌 【9】后台管理
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 启动服务器
app.listen(PORT, () => console.log(`🚀 服务器运行在 http://localhost:${PORT}`));
