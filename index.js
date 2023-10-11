const express= require('express')
const cors=require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
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

async function run() {
  try {

        const appointmentOptionsCollection = client.db('careHome').collection('appointmentOptions')
        const bookingCollections= client.db('careHome').collection('bookings')
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

        app.post('/bookings',async(req,res)=>
        {
            const booking= req.body;
            const result =await bookingCollections.insertOne(booking);
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