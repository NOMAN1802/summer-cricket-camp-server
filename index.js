const express = require('express')
const app = express()
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000

// middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())


const uri = 'mongodb://0.0.0.0:27017'


// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bduz0qc.mongodb.net/?retryWrites=true&w=majority`;

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

    const classCollection = client.db('SH75Db').collection('classes');
    const usersCollection = client.db("SH75Db").collection("users");

    //get api for  classes and instructors

    app.get('/classes', async (req, res) => {
      const query = req.body;
      const result = await classCollection.find(query).sort({ number_of_student: -1 }).toArray();
      res.send(result);
    })


    // app.post('/addClass', async (req,res)=>{
    //   const body = req.body;
    //   const result = await classCollection.insertOne(body);
    //   res.send(result)

    //   console.log(result);
    // })

    // student's selected course  related apis
  
    app.get('/classes', async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }

      const query = { email: email };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/classes', async (req, res) => {
      const item = req.body;
      const result = await classCollection.insertOne(item);
      res.send(result);
    })

    //user related api

    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      user.role = 'student';
      const query = { email: user.email, role: user.role}
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
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
  res.send('SH75 Academy Server is running..')
})

app.listen(port, () => {
  console.log(`SH75 Academy  is running on port ${port}`)
})