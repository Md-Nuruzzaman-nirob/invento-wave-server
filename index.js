const express = require('express');
const app = express()
const cors = require('cors');
require('dotenv').config()
const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY)


const port = process.env.PORT || 6001;

// middleware
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "https://invento-wave-server.vercel.app", "https://invento-wave.web.app", "https://invento-wave.firebaseapp.com"],
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
        const paymentsCollection = client.db('inventoDB').collection('payments')


        // >======= api middleware =======<
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({
                    message: 'unauthorized access'
                })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
                if (error) {
                    return res.status(401).send({
                        message: 'unauthorized access'
                    })
                } else {
                    req.decoded = decoded
                    next()
                }
            })
        }


        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = {
                email: email
            }

            const user = await usersCollection.findOne(query)

            if (user.role !== 'System-Admin') {
                return res.status(403).send({
                    message: 'forbidden access'
                })
            }
            next()
        }



        // >======= jwt token api =======<
        app.post('/api/jwt/token', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: '6h'
            })
            res.send(token)
        })


        // >======= user api =======<
        app.get('/api/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })

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
        app.get('/api/shop', verifyToken, async (req, res) => {
            const result = await shopCollection.find().toArray()
            res.send(result)
        })

        app.get('/api/shop/:email', verifyToken, async (req, res) => {
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

        app.patch('/api/shop/update/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const shopInfo = req.body;
            const query = {
                email: email
            };

            const queryResult = await shopCollection.findOne(query);
            if (!queryResult) {
                return res.status(404).send({
                    message: "Shop Not Found"
                });
            }

            const updateInfo = {
                $set: {
                    limit: queryResult.limit ? queryResult.limit + shopInfo.limit : 0 + shopInfo.limit,
                }
            }
            const result = await shopCollection.updateOne(query, updateInfo)
            res.send(result)
        })

        app.patch('/api/shop/update/limit/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const shopUpdateInfo = req.body;
            const query = {
                email: email
            };

            const queryResult = await shopCollection.findOne(query);
            if (!queryResult) {
                return res.status(404).send({
                    message: "Shop Not Found"
                });
            }

            const updateInfo = {
                $set: {
                    limit: queryResult.limit - shopUpdateInfo.limit,
                }
            }
            const result = await shopCollection.updateOne(query, updateInfo)
            res.send(result)
        })

        app.delete('/api/shop/delete/:email', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.email;
            const query = {
                _id: new ObjectId(id)
            };
            const result = await shopCollection.deleteOne(query)
            res.send(result)
        })


        // >======= product api =======<
        app.get('/api/products', verifyToken, async (req, res) => {
            const result = await productsCollection.find().toArray();
            res.send(result)
        })

        app.get('/api/product/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = {
                shopEmail: email,
            };

            const result = await productsCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/api/product/id/:id', verifyToken, async (req, res) => {
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


        app.patch('/api/product/update/:id', verifyToken, async (req, res) => {
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

        app.patch('/api/product/update/checkout/:id', verifyToken, async (req, res) => {
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

        app.delete('/api/product/delete/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            };

            const result = await productsCollection.deleteOne(query)
            res.send(result)
        })


        // >======= stripe api =======<
        app.post('/create-payment-intent', async (req, res) => {
            try {
                const {
                    price
                } = req.body;

                if (price === 0) {

                }
                const amount = price ? parseInt(price * 100) : 50;

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
        app.get('/api/sale', verifyToken, async (req, res) => {
            const result = await salesCollection.find().toArray();
            res.send(result)
        })

        app.get('/api/sale/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email,
            };

            const result = await salesCollection.find(query).toArray();
            res.send(result)
        })


        app.post('/api/sale/create', async (req, res) => {
            const productInfo = req.body
            const result = await salesCollection.insertOne(productInfo)
            res.send(result)
        })


        // >======= payment api =======<
        app.get('/api/payments', verifyToken, async (req, res) => {
            const result = await paymentsCollection.find().toArray();
            res.send(result)
        })

        app.get('/api/payment/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = {
                customerEmail: email,
            };

            const result = await paymentsCollection.find(query).toArray();
            res.send(result)
        })


        app.post('/api/payment/create', async (req, res) => {
            const paymentInfo = req.body
            const result = await paymentsCollection.insertOne(paymentInfo)
            res.send(result)
        })

    } finally {}
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('server is running')
})