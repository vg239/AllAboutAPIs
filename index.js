const express = require("express")
const bodyParser = require("body-parser")
const port = 3000;
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore} = require('firebase-admin/firestore');
const jwt = require("jsonwebtoken")

const serviceAccount = require("./path/to/jsonfile.json")

initializeApp({
    credential: cert(serviceAccount)
  });

const db = getFirestore()

const studentsCollection = db.collection("StudentSMS")

const app = express()

app.use(express.json())
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static('public'))

//middleware

app.use(async (req,res,next)=>{
    if(req.method == 'POST'){
        next();
        return
    }

    const{rollno, password} = req.headers;
    console.log(`Verifying student with rollno: ${rollno}`);
    //to check if roll no and password have been provided or not
    if(!rollno || !password){
        res.status(400).send("Roll no and password are required")
        return;
    }

    try{
        const docSnap = await studentsCollection.doc(rollno).get()

        if(!docSnap.exists){
            console.log(`Student with rollno: ${rollno} not found`);
            res.status(404).send("Student not found")
            return;
        }

        const student = docSnap.data()
        const decodedPassword = jwt.verify(student.password,"nevergonnagiveyouup")
        if(decodedPassword !== password){

            res.status(401).send("invalid password")
            return;
        }
        next();
    }
    catch(error){
        res.status(500).send("Error" + error.message)
    }

})

//creating the student

app.post("/students",async(req,res)=>{
    const {rollno,name,age,grade,attendance,password} = req.body;
    try{
        await studentsCollection.doc(rollno).set({
            name : name,
            age : age,
            grade : grade,
            attendance : attendance,
            password : jwt.sign(password,"nevergonnagiveyouup")
        })
        res.status(200).send("User has been added successfully")
    }
    catch(error){
        res.status(500)
        res.send("couldnt add the student due to "+ error.message)

    }
})

//read the students
app.get("/students", async(req,res)=>{
    try {
        const docSnap = await studentsCollection.get();
        if (docSnap.empty) {
            res.status(404).send("Couldn't fetch data");
            return;
        }
        const students = [];
        docSnap.forEach(doc => {
            const completeData=doc.data();
            const {password,...responseData} = completeData
            students.push(responseData);
        });
        res.status(200).json(students);
    } catch (error) {
        res.status(500).send("Error fetching students: " + error.message);
    }
})


//update the students

app.put("/students/:id",async(req,res)=>{
    const rollno = req.params.id;
    let {name,age,grade,attendance} = req.body;
    const docSnap = await studentsCollection.doc(rollno).get()
    if(!docSnap.exists){
        res.status(404).send("not found ")
    }
    await studentsCollection.doc(rollno).update({
        name : name || docSnap.data().name,
        age : age || docSnap.data().age,
        grade : grade || docSnap.data().grade,
        attendance : attendance || docSnap.data().attendance
    })
    const newdocSnap = await studentsCollection.doc(rollno).get()
    const {password, ...responseData} = newdocSnap.data()
    res.send(responseData).status()
})


// Delete the students
app.delete("/students/:id", async (req, res) => {
    const rollno = req.params.id;
    try {
        const docSnap = await studentsCollection.doc(rollno).get()
        
        if (!docSnap.exists) {
            res.status(404).send(`Student with ID ${rollno} does not exist`);
            return;
        }

        await studentsCollection.doc(rollno).delete();
        res.status(200).send(`Student with ID ${rollno} deleted successfully`);
    } catch (error) {
        res.status(500).send(`Error deleting student: ${error.message}`);
    }
});



app.listen(port,(req,res)=>{
    console.log(`server is running on port ${port}`)
})
