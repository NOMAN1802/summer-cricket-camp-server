const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000

// middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}




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



    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classCollection = client.db('SH75Db').collection('classes');
    const selectedCollection = client.db('SH75Db').collection('selected');
    const usersCollection = client.db("SH75Db").collection("users");
    const paymentCollection = client.db("SH75Db").collection("payments");

  // jwt token 

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    //get api for  classes and instructors

    app.get('/classes', async (req, res) => {
      const query = req.body;
      const result = await classCollection.find(query).sort({ number_of_student: -1 }).toArray();
      res.send(result);
    })

    // approve class get api 
    app.get("/classes/approved", async (req, res) => {
     
     const approve = req.body;
     const query = {
      status:  'approved'
      
     }
      
      const result = await classCollection
        .find(query)
        .sort({ number_of_student: -1 })
        .toArray();
      res.send(result);
    });


  //  status change api 
    
    app.patch('/classes/approved/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'approved'
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    app.patch('/classes/denied/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'denied'
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // admin feedback api 
    app.patch('/classes/feedbackDenied/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: ' your class is denied'
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    app.patch('/classes/feedbackApprove/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: ' your class is Approved'
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    

    app.get('/SelectedClasses', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }

      const query = { email: email };
      const result = await selectedCollection.find(query).toArray();
      res.send(result);
    });

    // TODO 

    app.get('/selectedClasses/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedCollection.findOne(query);
      res.send(result);
    })

    app.post('/selectedClasses', async (req, res) => {
      const cls = req.body;
      const result = await selectedCollection.insertOne(cls);
      res.send(result);
    })

    app.delete('/selectedClasses/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedCollection.deleteOne(query);
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
      const query = { email: user.email, role: user.role }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })


    app.get('/users/instructor/:email',verifyJWT,  async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result);
    })

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    app.get('/users/student/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ student: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { student: user?.role === 'student' }
      res.send(result);
    })
    // add class api

    app.get('/getBy/:email', async (req, res) => {
      const email = req.params.email;
      console.log('email is',email);
      const query = { instructor_email : email }
      const result = await classCollection.find(query).toArray()
      console.log(result);
      res.send(result)
      
      
    })
  

    app.post('/addClass', async (req,res)=>{
      const body = req.body;
      body.status = 'pending'
      const result = await classCollection.insertOne(body);
      res.send(result)

      console.log(result);
    })
 
    // create payment intent
    app.post('/create-payment-intent',verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    
    // payment related api

    // payment related api
   
    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body; 

      const insertResult = await paymentCollection.insertOne(payment);

      const query = { email: payment.email }
      const deleteResult = await selectedCollection.deleteOne(query)
      console.log(insertResult, deleteResult);
      res.send({ insertResult, deleteResult });
    })
    app.get('/enroll/:email', async (req, res) => {
      const email = req.params.email;
      console.log('email is',email);
      const query = { email : email }
      const result = await paymentCollection.find(query).toArray()
      console.log(result);
      res.send(result)
      
      
    })

    
    // app.post('/enrolled', async (req, res) => {
    //   const payment = req.body;
    //   const query = {
    //     $set: {
    //       state: 'enrol',
    //       seat: 0,
    //     },
    //     $inc:{
    //       seat: 1
    //     }
    //   };
    //   const result = await selectedCollection.updateOne(filter, query);
    //   res.send(result);
    // })
    // admin stats api 

    app.get('/admin-stats', verifyJWT, async (req, res) => {
      const users = await usersCollection.estimatedDocumentCount();
      const orders = await selectedCollection.estimatedDocumentCount();
      const classes = await classCollection.estimatedDocumentCount()
      const payments = await paymentCollection.find().toArray();
      const revenue = payments.reduce((sum, payment) => sum + payment.price, 0)
     res.send({
        revenue,
        users,
        classes,
        orders
      })
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
  res.send('SH75 Academy Server is running..')
})

app.listen(port, () => {
  console.log(`SH75 Academy  is running on port ${port}`)
})