const express = require('express');
const app = express()
const cors = require('cors');
require('dotenv').config()
const {
    MongoClient,
    ServerApiVersion
} = require('mongodb');

const port = process.env.PORT || 6001;

// middleware
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('server is running')
})

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


        // >======= user api =======<
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

        await client.db("admin").command({
            ping: 1
        });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {}
}
run().catch(console.dir);