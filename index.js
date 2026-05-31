const express = require('express')
const app = express();
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()
app.use(express.json())
app.use(cors())

const fileUpload = require("express-fileupload");
const { initializeApp, cert } = require("firebase-admin/app");

const serviceAccount = require("./admin.json");

app.use(fileUpload());
initializeApp({
  credential: cert(serviceAccount),
});



app.use((req, res, next) => {
    console.log(req.path)
    next()
})

const adminRoute = require('./admin/index')
const dealerRoute = require('./dealer/index')



app.use('/admin', adminRoute)
app.use('/dealer',dealerRoute)

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ status:0,message: "Invalid JSON format" });
  }
  next();
});

mongoose.connect(process.env.DATABASE_URL)
    .then(() => console.log('connected'))
    .catch((err) => console.log('error ' + err))

app.get('/', (_, res) => res.send('Welcome To RR Solutions:   ' + require('./package.json').version))



app.listen(process.env.PORT, (err) => {
    if (err) return console.log(err)
    console.log(`Your App is Running on http://${process.env.IPADDRESS}:${process.env.PORT}`)
    console.log(`User Docs is Running on http://${process.env.IPADDRESS}:${process.env.PORT}/user/docs`)
    console.log(`User Docs is Running on http://${process.env.IPADDRESS}:${process.env.PORT}/dealer/docs`)
    console.log(`User Docs is Running on http://${process.env.IPADDRESS}:${process.env.PORT}/admin/docs`)
})