//modules needed
const express = require('express');
const bodyParser = require('body-parser');
const date = require(__dirname + '/date.js');
const mongoose = require('mongoose');
const _ = require('lodash');

//initalizing port and app
const port = 3000;
const app = express();
//creating instance of the day
let day = date.getDay();

//initalizing navigation title
let navTitle = "";

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//creating db
mongoose.connect('mongodb://127.0.0.1:27017/todolistDB');

//db schema
const itemSchema = new mongoose.Schema({
    name: String
});

//creating model
const Item = mongoose.model("Item", itemSchema);

//Creating default items to insert into model
const listItem1 = new Item({
    name: "Work"
});

const listItem2 = new Item({
    name: "Lunch"
});

const listItem3 = new Item({
    name: "Study"
});

//creating array of detault items
const defaultItems = [listItem1, listItem2, listItem3];

//creating schema for model
const listSchema = {
    name: String,
    items: [itemSchema]
};

//initializing model
const List = mongoose.model("List", listSchema);

//get request for home route
app.get('/', (req, res) => {
    //checking db to see if any items exist within the collection
    const findItem = async function () {
        navTitle = "Work List";

        //call to db
        let foundItem = await Item.find({});

        //if no items exist with in the db, insert default created items
        if (foundItem.length === 0) {
            Item.insertMany([listItem1, listItem2, listItem3]).then(function () {
                console.log('Items added!');
                res.redirect('/');
            }).catch(function (err) {
                console.log(err);
            })
            //if items exist, render list.
        } else {
            res.render('list', { listTitle: day, newListItem: foundItem, navTitle: navTitle });
        }
    };
    //execute function
    findItem();
});


//get request for dynamic route names
app.get('/:listName', (req, res) => {
    navTitle = "Home";
    //lodash to capitalize the route name -> work would become Work, etx
    const customListName = _.capitalize(req.params.listName);
    //function to check if list exists
    const findList = async function () {
        // call to db
        let foundList = await List.findOne({ name: customListName })
        //if no items exist, push default items to the list, save and redirect to list name
        if (!foundList) {
            const list = new List({
                name: customListName,
                items: defaultItems
            });
            list.save();
            res.redirect('/' + customListName);
        }
        //if items do exist, render list 
        else {
            res.render("list", { listTitle: foundList.name + " " + day, newListItem: foundList.items, navTitle: navTitle });
        }
    };
    //execute function
    findList();
});

//delete handler
app.post('/delete', (req, res) => {
    //creating variables for the current day, item ID, name of ID and a parameter to search by
    const today = date.getDay().toString();
    const checkedItemID = req.body.deleteItem;
    const deleteListName = req.body.deleteListName;
    const redirectName = deleteListName.split(' ');

    //if today includes the name of the redirectName -> Thursday, then delete from the home list
    if (today.includes(redirectName[0])) {
        //calling deleteOne on collection, then displaying success message
        Item.deleteOne({ _id: checkedItemID }).then(function () {
            console.log('Item deleted!');
            res.redirect('/');
        }).catch(function (error) {
            console.log(error);
        });
    }
    //if the first work of the list name is not included in today, assume it's custom list 
    else {
        //Call findOneAndUpdate on list, pass in name of list, $pull the items that match the passed ids
        List.findOneAndUpdate({ name: redirectName }, { $pull: { items: { _id: checkedItemID } } }).then(function () {
            res.redirect('/' + redirectName[0]);
            console.log('in new list');
        }).catch(function (error) {
            console.log(error);
        })
    }
});

//post handler for adding items
app.post('/', (req, res) => {

    //variables used
    let item = req.body.newItem;
    let listName = req.body.list;
    let today = date.getDay().toString();

    //creating new items
    const newItem = new Item({
        name: item
    });

    //if the days match up, assume home route, add the item to the home list
    if (today.includes(listName)) {
        newItem.save();
        res.redirect('/');
    }
    //if the days do not match, assume custom list
    else {
        //create function to find the list by name
        const findList = async function () {
            let foundList = await List.findOne({ name: listName })
            //push new item into the list array, save and redirect to list
            foundList.items.push(newItem);
            foundList.save();
            res.redirect('/' + listName);
        };
        findList();
    }
});

//navigation route for the work or home list
app.post('/navigate', (req, res) => {
    if (req.body.list === 'Work') {
        res.redirect('/');
    }
    else {
        res.redirect('/work');
    }
});

//app start up 
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});