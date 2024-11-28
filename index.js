const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const SSLCommerzPayment = require('sslcommerz-lts');
const bcrypt = require('bcrypt');
const saltRounds = 10; // You can adjust the salt rounds based on your security preference


const app = express();
const port = process.env.PORT || 5000;

// Middleware setup
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser())


const store_id = process.env.STORE_ID
const store_passwd = process.env.STORE_PASSWORD
const is_live = false //true for live, false for sandbox

// JWT Verify MiddleWare 

const verifyWebToken = (req, res, next) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).send({ message: 'Unauthorized Access' })
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'Unauthorized Access' })

      }
      console.log(decoded)
      req.user = decoded
      next()

    })

  }
  console.log(token)


}


// MongoDB URI from environment variables
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_USERPASSWORD}@cluster0.neywkpg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient instance
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});







// Connect to the database and set up the collection
async function run() {
  try {
    // Connect to the MongoDB client
    await client.connect();

    const SignUpUserCollection = client.db('MedConnect').collection('SignUpUsers')
    const DoctorsCollection = client.db('MedConnect').collection('Doctors');
    const BlogCollection = client.db('MedConnect').collection('Blog')
    const AppointmentCollection = client.db('MedConnect').collection('Appointment')



    //jwt generate

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET_KEY, {
        expiresIn: '365d'
      })
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      }).send({ success: true })
    })


    // clear token on logout

    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            httpOnly: true,
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })




    // ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,


    // Example Express.js Backend Route (assuming MongoDB)

    app.post('/signup', async (req, res) => {
      const { fullName, email, phoneNumber, nationality, role, image, password } = req.body;

      try {
        // Check if the user already exists by email
        const existingUser = await SignUpUserCollection.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Hash the password if provided
        let hashedPassword = password;
        if (password) {
          hashedPassword = await bcrypt.hash(password, saltRounds); // Salt rounds can be adjusted
        }

        // Insert user data into the User collection
        const newUser = {
          fullName,
          email,
          phoneNumber,
          nationality,
          role,
          image,
          password: hashedPassword,
        };

        const result = await SignUpUserCollection.insertOne(newUser);

        if (result.acknowledged) {
          // Send a success response
          res.status(200).json({ success: true, message: 'User created successfully' });
        } else {
          res.status(500).json({ success: false, message: 'Error creating user' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });


    //get the google user data
    app.get('/signup', async (req, res) => {
      const result = await SignUpUserCollection.find().toArray()
      res.send(result)
    });



    // Doctors information save 
    app.post('/doctors', async (req, res) => {
      try {
        const {
          userEmail, userImage, fullName, dob, gender, nationality, medicalRegistration,
          specialization, experience, email, visit, phone, highestEducation,
          medicalSchool, graduationYear, medicalDegree, motivation, careerGoals,
          hospitalClinicName, position, duration, availableDays, resume,
          medicalLicense, availableTime, references, yourSelf, approval,
        } = req.body;

        // Ensure that all required fields are provided
        if (!fullName || !dob || !email || !phone) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        const formData = {
          userEmail,
          userImage,
          fullName,
          dob,
          gender,
          nationality,
          medicalRegistration,
          specialization,
          experience,
          email,
          visit,
          phone,
          highestEducation,
          medicalSchool,
          graduationYear,
          medicalDegree,
          motivation,
          careerGoals,
          hospitalClinicName,
          position,
          duration,
          availableDays,
          resume,
          medicalLicense,
          availableTime,
          references,
          yourSelf,
          createdAt: new Date(),
          approval,
        };

        // Insert the form data into the database
        const result = await DoctorsCollection.insertOne(formData);
        res.status(200).json({ message: 'Form submitted successfully', result });

      } catch (error) {
        console.error('Error handling form submission:', error);
        res.status(500).json({ message: 'Error submitting form', error: error.message });
      }
    });


    // Get the Doctors user data
    app.get('/doctors', async (req, res) => {
      try {
        const result = await DoctorsCollection.find().toArray();
        res.status(200).send(result); // Send a success response with the fetched data
      } catch (error) {
        console.error("Error fetching doctors:", error);
        res.status(500).send({ message: "Failed to fetch doctors", error });
      }
    });




    // Update doctor approval 
    app.put('/doctors/:id', async (req, res) => {
      try {
        const { id } = req.body;
        const result = await DoctorsCollection.updateOne(
          { id },
          { $set: { approval: "true" } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'An error occurred while updating user status.', error });
      }
    });


    app.get('/doctors/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await DoctorsCollection.findOne(query);
      res.send(result);
    });






    // Property information save
    app.post('/blog', verifyWebToken, async (req, res) => {
      try {
        const {
          userEmail,
          userImage,
          userName,
          title,
          description,
          blogCategory,
          images,
          views,
          createdDate,
          createdTime,
        } = req.body;

        // Construct the formData object
        const formData = {
          userEmail,
          userImage,
          userName,
          title,
          description,
          blogCategory,
          images,
          views,
          createdDate,
          createdTime,
        };

        // Insert into MongoDB
        const result = await BlogCollection.insertOne(formData);

        res.status(200).json({ message: 'Property added successfully', result });
      } catch (error) {
        console.error('Error handling form submission:', error);
        res.status(500).json({ message: 'Error submitting form', error: error.message });
      }
    });




    // Get the Doctors user data
    app.get('/blog', async (req, res) => {
      try {
        const result = await BlogCollection.find().toArray();
        res.status(200).send(result); // Send a success response with the fetched data
      } catch (error) {
        console.error("Error fetching doctors:", error);
        res.status(500).send({ message: "Failed to fetch doctors", error });
      }
    });



    app.get('/blog/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await BlogCollection.findOne(query);
      res.send(result);
    });


   


    // Backend: Delete Blog Post (DELETE)
    app.delete('/blogs/:id', async (req, res) => {
      try {
        const { id } = req.params; // Extract the blog post ID from URL parameters

        // Delete the blog post from the database
        const result = await BlogCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount > 0) {
          res.status(200).send({ message: 'Blog post deleted successfully' });
        } else {
          res.status(404).send({ message: 'Blog post not found' });
        }
      } catch (error) {
        res.status(500).send({ message: 'An error occurred while deleting the blog post.', error });
      }
    });






    

    // ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,




    // SSL Commerz Payment System 

    const tran_ids = new ObjectId().toString();
  
    // POST endpoint for order processing
    app.post('/order', async (req, res) => {
      try {
        const { doctorId, userEmail, paymentAmount, appointmentStatus } = req.body;
    
        const doctorAppointment = await DoctorsCollection.findOne({ _id: new ObjectId(doctorId) });
        if (!doctorAppointment) {
          return res.status(404).json({ message: 'Doctor not found' });
        }
    
       
    
        const data = {
 
          total_amount: doctorAppointment.visit,
          currency: 'BDT',
          tran_id: tran_ids, // use unique tran_id for each api call
          success_url: `http://localhost:5000/payment/success/${tran_ids}`,
          fail_url: `http://localhost:5000/payment/fail/${tran_ids}`,
          cancel_url: 'http://localhost:3030/cancel',
          ipn_url: 'http://localhost:3030/ipn',
          shipping_method: 'Courier',
          product_name: 'Computer.',
          product_category: 'Electronic',
          product_profile: 'general',
          cus_name: 'Customer Name',
          cus_email: 'customer@example.com',
          doctor_name: doctorAppointment.fullName,
          doctor_specialization: doctorAppointment.specialization,
          doctor_email: doctorAppointment.userEmail,
          
          paitent_email: userEmail,
          appointment_status: appointmentStatus,
          cus_add1: 'Dhaka',
          cus_add2: 'Dhaka',
          cus_city: 'Dhaka',
          cus_state: 'Dhaka',
          cus_postcode: '1000',
          cus_country: 'Bangladesh',
          cus_phone: '01711111111',
          cus_fax: '01711111111',
          ship_name: 'Customer Name',
          ship_add1: 'Dhaka',
          ship_add2: 'Dhaka',
          ship_city: 'Dhaka',
          ship_state: 'Dhaka',
          ship_postcode: 1000,
          ship_country: 'Bangladesh',
        };
    
        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
        sslcz.init(data).then((apiResponse) => {
          let GatewayPageURL = apiResponse?.GatewayPageURL;
          res.send({ url: GatewayPageURL });

          const finalOrder = {
            doctorAppointment,doctor_name: doctorAppointment.fullName,
            doctor_specialization: doctorAppointment.specialization,
            doctor_visit:doctorAppointment?.visit,
            doctor_email: doctorAppointment.userEmail,
            
            paitent_email: userEmail,
            appointment_status: appointmentStatus, paidStatus: false,
            tranjectionId:tran_ids,
          };

          const result = AppointmentCollection.insertOne(finalOrder);



        });
      } catch (error) {
        console.error('Error processing payment:', error);
        return res.status(500).json({ message: 'Server error', error });
      }
    });
    



    app.post("/payment/success/:tranId",async(req,res)=>{
      console.log(req.params.tranId);
      const result = await AppointmentCollection.updateOne({tranjectionId:req.params.tranId},
        {
          $set:{
            paidStatus:true,
          },
        }
      );

      if((await result).modifiedCount>0){
        res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`)
      }
      
    })




    app.post('/payment/fail/:tranId',async(req,res)=>{
      const result = await AppointmentCollection.deleteOne({tranjectionId:req.params.tranId})

      if(result.deletedCount){
        res.redirect(`http://localhost:5173/payment/fail/${req.params.tranId}`)
      }
    })



    // Get the Doctors user data
    app.get('/order', async (req, res) => {
      try {
        const result = await AppointmentCollection.find().toArray();
        res.status(200).send(result); // Send a success response with the fetched data
      } catch (error) {
        console.error("Error fetching doctors:", error);
        res.status(500).send({ message: "Failed to fetch doctors", error });
      }
    });




    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

// Run the MongoDB connection
run().catch(console.dir);


app.post('/', (req, res) => {
  const { name, email, message } = req.body;
  console.log(name, email, message)
})

// Define a simple route
app.get('/', (req, res) => {
  res.send("Online Medical server is running..");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});

