const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

mongoose.connect('mongodb://localhost:27017/deliveryDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB 连接成功'))
.catch(err => console.error('❌ MongoDB 连接失败:', err));

const DeliverySchema = new mongoose.Schema({
    trackingNumber: { type: String, unique: true, required: true },
    status: { type: String, required: true },
    history: [{ status: String, updatedAt: Date }],
    updatedAt: { type: Date, default: Date.now },
});

const Delivery = mongoose.model('Delivery', DeliverySchema);

app.use(express.json());
app.use(cors());

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

app.post('/delete', async (req, res) => {
    const { trackingNumber } = req.body;
    try {
        await Delivery.deleteOne({ trackingNumber });
        res.json({ message: "快递信息已删除" });
    } catch (error) {
        res.status(500).json({ message: "服务器错误" });
    }
});

app.listen(PORT, () => console.log(`🚀 服务器运行在 http://localhost:${PORT}`));
