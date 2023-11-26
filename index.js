const express = require('express');
const app = express()
const cors = require('cors');
require('dotenv').config()
const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY)

const port = process.env.PORT || 6001;

// middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://invento-wave-server.vercel.app'],
    credentials: true
}));

app.use(express.json())

app.listen(port, () => {
    console.log('server running on', port);
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.okhcvei.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        // collections
        const usersCollection = client.db('inventoDB').collection('users')
        const shopCollection = client.db('inventoDB').collection('shop')
        const productsCollection = client.db('inventoDB').collection('products')
        const salesCollection = client.db('inventoDB').collection('sales')


        // >======= user api =======<
        app.get('/api/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email
            };
            const result = await usersCollection.findOne(query);
            res.send(result)
        })

        app.post('/api/user/create', async (req, res) => {
            const userInfo = req.body
            const result = await usersCollection.insertOne(userInfo)
            res.send(result)
        })

        app.post('/api/user/create/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email
            };
            const queryResult = await usersCollection.findOne(query);

            if (queryResult) {
                return res.send({
                    message: "already have an account"
                });
            }

            const userInfo = req.body
            const result = await usersCollection.insertOne(userInfo)
            res.send(result)
        })

        app.patch('/api/user/update/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email
            };
            const queryResult = await shopCollection.findOne(query);

            if (!queryResult) {
                return res.status(404).json({
                    error: "User not found"
                });
            }
            const updateUser = {
                $set: {
                    role: 'Shop-Manager',
                    shopName: queryResult.shopName,
                    shopId: queryResult._id,
                    shopLogo: queryResult.shopLogo
                }
            };
            const result = await usersCollection.updateOne(query, updateUser);
            res.send(result);
        });


        // >======= shop api =======<
        app.get('/api/shop/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email
            };
            const result = await shopCollection.findOne(query);
            res.send(result)
        })

        app.post('/api/shop/create', async (req, res) => {
            const email = req.body.email
            const query = {
                email: email
            };
            const queryResult = await shopCollection.findOne(query);

            if (queryResult) {
                return res.send({
                    message: "You already have a shop! Manage it from your dashboard."
                });
            }
            const userInfo = req.body
            const result = await shopCollection.insertOne(userInfo)
            res.send(result)
        })

        // >======= product api =======<
        app.get('/api/product/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                shopEmail: email,
            };

            const result = await productsCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/api/product/single/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            };

            const result = await productsCollection.findOne(query);
            res.send(result)
        })

        app.post('/api/product/create', async (req, res) => {
            const productInfo = req.body
            const result = await productsCollection.insertOne(productInfo)
            res.send(result)
        })


        app.patch('/api/product/update/:id', async (req, res) => {
            const id = req.params.id;
            const productInfo = req.body;
            const query = {
                _id: new ObjectId(id)
            };
            const productUpdateInfo = {
                $set: {
                    productName: productInfo.productName,
                    productQuantity: productInfo.productQuantity,
                    productionCost: productInfo.productionCost,
                    profitMarginPercent: productInfo.profitMarginPercent,
                    discountPercent: productInfo.discountPercent,
                    productImage: productInfo.productImage,
                    productCode: productInfo.productCode,
                    productLocation: productInfo.productLocation,
                    description: productInfo.description,
                    sellingPrice: productInfo.sellingPrice,
                    lastUpdate: productInfo.lastUpdate,
                }
            }
            const result = await productsCollection.updateOne(query, productUpdateInfo)
            res.send(result)
        })

        app.patch('/api/product/update/checkout/:id', async (req, res) => {
            const id = req.params.id;
            const productInfo = req.body;
            const query = {
                _id: new ObjectId(id)
            };
            const productUpdateInfo = {
                $set: {
                    productQuantity: productInfo.productQuantity,
                    sellCount: productInfo.sellCount,
                }
            }
            const result = await productsCollection.updateOne(query, productUpdateInfo)
            res.send(result)
        })

        app.delete('/api/product/update/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            };

            const result = await productsCollection.deleteOne(query)
            res.send(result)
        })


        // >======= payment api =======<
        app.post('/create-payment-intent', async (req, res) => {
            try {
                const {
                    price
                } = req.body;
                const amount = parseInt(price * 100);

                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: 'usd',
                    payment_method_types: ['card'],
                });

                res.send({
                    clientSecret: paymentIntent.client_secret
                });
            } catch (error) {
                console.error("Error creating payment intent:", error);
                res.status(500).send({
                    error: "Error creating payment intent."
                });
            }
        });

        // >======= sale api =======<
        app.post('/api/sale/create', async (req, res) => {
            const productInfo = req.body
            const result = await salesCollection.insertOne(productInfo)
            res.send(result)
        })


        // await client.db("admin").command({
        //     ping: 1
        // });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {}
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('server is running')
})