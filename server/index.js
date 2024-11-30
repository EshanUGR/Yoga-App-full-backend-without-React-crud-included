const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 3000;
const jwt=require("jsonwebtoken");
// console.log(process.env.DB_USER);
const cors=require('cors');
app.use(cors());
app.use(express.json());

//set token

//mongodb connection
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.f1xi3st.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    //create a database
    const database = client.db("yoga-master");
    const userCollection = database.collection("users");

    const classCollection = database.collection("classes");

    const cartCollection = database.collection("cart");
    const paymentCollection = database.collection("payments");
    const enrolledConnection = database.collection("enrolled");
    const appliedCollection = database.collection("applied");

    //classes routes here


    app.post("/api/set-token",async(req,res)=>
    {
      const user=req.body;
      const token=jwt.sign(user,)
    })

    app.post("/new-class", async (req, res) => {
      const newClass = req.body;
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    });

    app.get("/classes", async (req, res) => {
      const query = { status: "approved" };
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    app.get("/classes/:email", async (req, res) => {
      const email = req.params.email;
      const query = { instructorEmail: email };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/classes-manage", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    //update class status
    app.put("/change-status/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const reason = req.body.reason;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: status,
          reason: reason,
        },
      };
      const result = await classCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.get("/approved-classes", async (req, res) => {
      const query = { status: "approved" };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    //get signal class

    app.get("/class/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
    });

    //update class details (all data)

    app.put("/update-class/:id", async (req, res) => {
      const id = req.params.id;

      const updateClass = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: updateClass.name,
          description: updateClass.description,
          price: updateClass.price,
          availableSeats: parseInt(updateClass.availableSeats),
          videoLink: updateClass.videoLink,
          status: "Pending",
        },
      };
      const result = await classCollection.updateOne(
        filter,
        updateDoc,
        options
      );
    });

    //cart routes

   app.post("/add-to-cart", async (req, res) => {
     try {
       const newCartItem = req.body;

       // Validate required fields if necessary, e.g.:
       // if (!newCartItem.name || !newCartItem.price) {
       //   return res.status(400).send({ error: "Item name and price are required" });
       // }

       const result = await cartCollection.insertOne(newCartItem);

       res.status(200).send(result); // Respond with a 200 status code on success
     } catch (error) {
       console.error("Error adding to cart:", error);
       res.status(500).send({ error: "Failed to add item to cart" }); // Send error response if any
     }
   });



    //get cart items by id
    //change data useremail to email
    app.get('/cart-item/:id',async (req,res)=>
    {
      const id=req.params.id;
  const email=req.body.email;
  const query={
    classId:id,
    email:email
  };
  const projection={classId:1};
  const result=await cartCollection.findOne(query,{projection:projection});
  res.send(result);
    })


    //cart info by email

    app.get('/cart/:email',async(req,res)=>
    {
      const email=req.params.email;
      const query={userMail:email};
      const projection={classId:1};
      const carts=await cartCollection.find(query,{projection:projection});

const classId=carts.map((cart)=>new  ObjectId(cart.classId));
const query2={_id:{$in:classId}};
const result=await classCollection.find(query2).toArray();
res.send(result);


    })

    //delete cart items

    app.delete('/delete-cart-item/:id',async(req,res)=>
    {
      const id=req.params.id;
      const query={classId:id};
      const result=await cartCollection.deleteOne(query);
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your depoyment.You sucessfuly connected to MongoDB! ");
  } finally {
   
  }
}
run().catch.close;

app.get("/", (req, res) => {
  res.send("Hello Developers sl");
});

//enrollment routes

app.get("/popular_classes",async(req,res)=>
{
  const result=await classCollection.find().sort({totalEnrolled:-1}).limit(6).toArray();


})


app.get('/popular-instructors',async(req,res)=>
{
  const pipeline=[
    {
$group:{
      _id:"$instructorEmail",
      totalEnrolled:{$sum:"$totalEnrolled"}
    }
    }
    
  ,{
    $lookup:{
      from:"users",
      localField:"_id",
      foreignField:"_id",
      as:"instructor"


    }
  },{
    $project:{
      _id:0,
      instructor:{
        $arrayElemAt:["$instructor",0]
      },
      totalEnrolled:1

    }
  },{
    $sort:{
      totalEnrolled:-1
    }
  },{
    $limit:6
  }
];
const result=await classCollection.ageregate(pipeline).toArray();
res.send(result);
})

app.get('/admin-stats',async (req,res)=>
{
  const approvedClasses=((await classCollection.find({status:'approved'})).toArray()).length;
  const pendingClasses=((await classCollection.find({status:'pending'})).toArray()).length;
  const instructor=((await userCollection.find({role:'Instructor'})).toArray()).length;
const totalClasses=(await classCollection.find().toArray()).length
const totalEnrolled=(await enrolledConnection.find().toArray()).length;
const result={
  approvedClasses,
  pendingClasses,
  totalClasses,
  totalEnrolled
}
res.send(result);

})

app.post('/ass-instructor',async(req,res)=>
{
  const data=req.body;
  const result=await appliedCollection.insertOne(data);
  res.send(result);
})

app.get('/applied-instructors/:email',async(req,res)=>
{
  const email=req.params.email;
  const result=await appliedCollection.findOne({email});
  res.send(result);
})

//routes for users
app.post('/new-user',async(req,res)=>
{
  const newUser=req.body;
  const result=await userCollection.instructor(newUser);
  res.send(result);
})

app.get('/users/:id',async(req,res)=>
{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await userCollection.findOne(query);
  res.send(result)

})

app.get('/user/:email',async(req,res)=>
{
  const email=req.params.email;
  const query={email:email};
  const result=await userCollection.findOne(query);
  res.send(result);
})
app.delete('/delete-user/:id',async(req,res)=>
{
  const id=req.params.id;
  const query={_id:new ObjectId(id)};
  const result=await userCollection.deleteOne(query);
  res.send(query);
})
app.put('/update-user/:id',async(req,res)=>
{
  const id=req.params.id;
  const updateUser=req.body;
  const filter={_id:new ObjectId(id)};
  const options={upsert:true};
  const updateDoc={
    $set:{
      name:updateUser.name,
      email:updateUser.email,
      role:updateUser.options,
      address:updateUser.address,
      about:updateUser.about,
      photoUrl:updateUser.photoUrl,
      skills:updateUser.skills?updateUser.skills:null
    }
  }
  const result=await userCollection.updateOne(filter,updateDoc,options);

})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
