const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json())
//jwt middleware
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next()
    })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zbcvy.mongodb.net/?retryWrites=true&w=majority`;




// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const classCollection = client.db('sportsClub').collection('allclasses')
        const userCollection = client.db('sportsClub').collection('users')
        const cartCollection = client.db('sportsClub').collection('carts')

        // jwt api 
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' })
            res.send({ token })
        })

        //admin check secure middleware
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'error message' })
            }
            next()
        }
        //student check secure middleware
        const verifyStudent = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            if (user?.role !== 'student') {
                return res.status(403).send({ error: true, message: 'error message' })
            }
            next()
        }
        //instructor check secure middleware
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'error message' })
            }
            next()
        }

        //all instructors api
        app.get('/allinstructor/:role', async (req, res) => {
            console.log(req.params.role);
            const result = await userCollection.find({ role: req.params.role }).toArray()
            res.send(result)
        })

        /*        users api------------------------
               --------------------------------- */

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            // console.log(user);
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user exists' })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })
        //make admin
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params;
            console.log(id);
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        //make student
        app.patch('/users/student/:id', async (req, res) => {
            const id = req.params;
            console.log(id);
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'student'
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        //make instructor
        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params;
            console.log(id);
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        //check admin
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result)
        })

        //check student
        app.get('/users/student/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ student: false })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { student: user?.role === 'student' }
            res.send(result)
        })

        //check instructor
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result)
        })



        //add classes api----------------
        // ------------------------------

        app.post('/allclasses', verifyJWT, verifyInstructor, async (req, res) => {
            const addClass = req.body;
            const result = await classCollection.insertOne(addClass)
            res.send(result)

        })


        //instructor added all classes
        app.get('/allclasses/:email', async (req, res) => {
            const email = req.query.email;
            // console.log(req.params.email);
            const result = await classCollection.find({ email: req.params.email }).toArray()
            res.send(result)
        })

        //add ,verifyJWT, verifyAdmin TODO
        app.get('/allclasses', async (req, res) => {
            const result = await classCollection.find({}).toArray();
            res.send(result);
        })

        //update class pending status
        app.patch('/allclass/:id', async (req, res) => {
            const id = req.params;
            console.log(id);
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'approved'
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        //

        app.patch('/allclasss/:id', async (req, res) => {
            const id = req.params;
            console.log(id);
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'deny'
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        //feedback
        app.put('/allclass/:id', async (req, res) => {
            const id = req.params.id;
            const feedback = req.body;
            console.log(id, feedback);
            const filter = { _id: new ObjectId(id) }
            options = { upsert: true }
            const updatedFeedback = {
                $set: {
                    feedback: feedback.feedback
                }
            }
            const result = await classCollection.updateOne(filter, updatedFeedback, options)
            res.send(result)
        })

        //get approved classes
        app.get(('/approvedclass/:text'), async (req, res) => {
            // console.log(req.params.text);
            if (req.params.text == 'approved') {
                const result = await classCollection.find({ status: req.params.text }).toArray()
                return res.send(result)
            }
        })
        // -----------------------------------------------------
        //.......student selected cart collection related api-----------
        // -------------------------------------------------------
        app.post('/carts', async (req, res) => {
            const item = req.body;
            console.log(item);
            const result = await cartCollection.insertOne(item)
            res.send(result);
        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Sports club Server is running..')
})

app.listen(port, () => {
    console.log(`Sports club is running on port ${port}`)
})
