const express= require('express')
const cors=require('cors')
const jwt= require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;


const app=express()


app.use(cors())
app.use(express.json());




const uri = `mongodb+srv://careHome:z9aDpcWwqwhWRqbS@cluster0.px2gaoj.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


function varifyJWT(req,res,next)
{
  console.log('jwt', req.headers.authorization)
  const authHeader=req.headers.authorization;
  if(!authHeader)
  {
    return res.status(401).send('Unauthorised Access');
  }
  const token= authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN,function(err,decoded)
  {
    if(err)
    {
      return res.status(403).send({message: 'forbidden access'})
    }
    req.decoded=decoded;
    next();
  })
}


async function run() {
  try {

        const appointmentOptionsCollection = client.db('careHome').collection('appointmentOptions')
        const bookingCollections= client.db('careHome').collection('bookings')
        const userCollections= client.db('careHome').collection('users')
        //user aggregate to query multiple collection and then merge data
        app.get('/appointmentOptions',async(req,res)=>
        {
            const date=req.query.date;
            const query={};
            const appointmentOptions= await appointmentOptionsCollection.find(query).toArray();
           
            //getting a perticular date from client site 
             const bookingQuery= {appointmentDate:date}
           
             //getting all appointmented/booked service for a particular date
             const alreadyBookedOptions= await bookingCollections.find(bookingQuery).toArray();
             
             //filtering all appointments for that day
              appointmentOptions.map(appointmentOption=>{
              const bookedOption= alreadyBookedOptions.filter(options=>options.treatment==appointmentOption.name)

            //getting all booked slots
              const bookedSlots= bookedOption.map(option=>option.slots)
               
            // filtering the available slots for the date
              const remainingSlots= appointmentOption.slots.filter(slot=>!bookedSlots.includes(slot))
              console.log(date,appointmentOption.name,remainingSlots.length)

              appointmentOption.slots=remainingSlots

            })
            res.send(appointmentOptions)
        })

        // API naming convention
        // app.get('/bookings') to get the all booking data
        // app.get('/bookings/:id') to get a specific booking data 
        // app.post('/bookings') to add a new booking data
        // app.patch('/bookingd/:id') to update a specific booking data
        // app.delete('/bookingd/:id') to delete a specific booking data

        app.get('/bookings',varifyJWT,async(req,res)=>
        {
          const email = req.query.email;
          const decodedEmail =req.decoded.email; 
          if(email!==decodedEmail)
          {
            return res.status(403).send({message: 'forbidden access'})
          }
          const query= {email:email}
          const bookings= await bookingCollections.find(query).toArray();
          res.send(bookings)
        })


        app.post('/bookings',async(req,res)=>
        {
            const booking= req.body;
            const query={
              email:booking.email,
              appointmentDate:booking.appointmentDate,
              treatment:booking.treatment
            }

            const bookingCount = await bookingCollections.find(query).toArray();
            if(bookingCount.length)
            {
              const message = `Already have a booking on ${booking.appointmentDate}`
              return res.send({acknowledged:false,message})
            }

            const result =await bookingCollections.insertOne(booking);
            res.send(result)
        })



        app.get('/jwt',async(req,res)=>
        {
          const email= req.query.email
          const query={email:email}
          const user= await userCollections.findOne(query)
          if(user)
          {
            const token=jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn:'1h'})
            return res.send({accessToken:token})
          }
          console.log(user)
          res.status(403).send({accessToken:''})
        })

        app.get('/users',async (req,res)=>
        {
          const query={}
          const users=await userCollections.find(query).toArray()
          res.send(users)
        })


        app.get('/users/admin/:email', async (req,res)=>
        {
          const email =req.params.email;
          const query={email}
          const user = await userCollections.findOne(query)
          res.send({isAdmin: user?.role=='admin'});
        })


        app.post('/users',async(req,res)=>
        {
          const user=req.body;
          const result= await userCollections.insertOne(user)
          res.send(result)
        })

        app.put('/users/admin/:id',varifyJWT,async(req,res)=>
        {
          const decodedEmail=req.decoded.email

          const query={email:decodedEmail};
          const user=await userCollections.findOne(query)
          if(user?.role !=='admin')
          {
            return res.status(403).send({message: 'forbidden access'})
          }

          const id=req.params.id;
          const filter={_id: new ObjectId(id)}
          const options={upsert:true};
          const updatedDoc={
            $set:{
              role:'admin'
            }
          }
          const result= await userCollections.updateOne(filter,updatedDoc,options)
          res.send(result)
        })

        // app.get('/bookings',async (req,res)=>
        // {
        //   const query={}
        //   const bookingCollections= await bookingCollections.find(query).toArray();
        //   res.send(bookingCollections)
        // })


  } 
  
  finally {



  }
}
run().catch(console.dir);




app.get('/',async(req,res)=>
{
    res.send('doctors portal')
})



app.listen(port,()=>
{
    console.log(`server running on port ${port}`)
})