/*********************************************************************************
*  WEB322 – Assignment 04
*  I declare that this assignment is my own work in accordance with Seneca  Academic Policy.  No part 
*  of this assignment has been copied manually or electronically from any other source 
*  (including 3rd party web sites) or distributed to other students.
* 
*  Name: MEHAK RAJPUT Student ID: 112874227 Date: 2023/02/11
*
*  Online (Cyclic) Link: https://victorious-hat-lamb.cyclic.app
*
********************************************************************************/ 


const express = require('express');
const path = require("path");
const app = express();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const blog_service = require("./blog-service");
const upload = multer();
const exphbs = require('express-handlebars');
const stripJs = require('strip-js');

// set port
const HTTP_PORT = process.env.PORT || 8080;

cloudinary.config({
    cloud_name: 'dltw8gfwe',
    api_key: '667857881175663',
    api_secret: 'p2TmXRHXdPQd2WTiknOqdOL1y_o',
    secure: true
});

// middleware
app.use(express.static("public"));
app.use(upload.single("featureImage"));
app.use(function(req,res,next){
    let route = req.path.substring(1);
    app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));
    app.locals.viewingCategory = req.query.category;
    next();
});


// add handlebars engines and helpers
app.engine('.hbs', exphbs.engine({
    extname:'.hbs', 
    helpers: {
        navLink: function(url, options) {
            return '<li' + 
                ((url == app.locals.activeRoute) ? ' class="active" ' : '') + 
                '><a href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function(lvalue, rvalue, options) {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        },
        safeHTML: function(context){
            return stripJs(context);
        }        
    }}));
app.set('view engine', 'hbs');

// app routes
app.get('/', (req, res) => {
    res.redirect("/blog")
});
app.get('/about', (req, res) => {
    res.render('about');
})
app.get('/blog', async (req, res) => {
    // Declare an object to store properties for the view
    let viewData = {};

    try{

        // declare empty array to hold "post" objects
        let posts = [];

        // if there's a "category" query, filter the returned posts by category
        if(req.query.category){
            // Obtain the published "posts" by category
            posts = await blog_service.getPublishedPostsByCategory(req.query.category);
        }else{
            // Obtain the published "posts"
            posts = await blog_service.getPublishedPosts();
        }

        // sort the published posts by postDate
        posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));

        // get the latest post from the front of the list (element 0)
        let post = posts[0]; 

        // store the "posts" and "post" data in the viewData object (to be passed to the view)
        viewData.posts = posts;
        viewData.post = post;

    }catch(err){
        viewData.message = "no results";
    }

    try{
        // Obtain the full list of "categories"
        let categories = await blog_service.getCategories();

        // store the "categories" data in the viewData object (to be passed to the view)
        viewData.categories = categories;
    }catch(err){
        viewData.categoriesMessage = "no results"
    }

    // render the "blog" view with all of the data (viewData)
    res.render("blog", {data: viewData})

});
app.get('/blog/:id', async (req, res) => {

    // Declare an object to store properties for the view
    let viewData = {};

    try{

        // declare empty array to hold "post" objects
        let posts = [];

        // if there's a "category" query, filter the returned posts by category
        if(req.query.category){
            // Obtain the published "posts" by category
            posts = await blog_service.getPublishedPostsByCategory(req.query.category);
        }else{
            // Obtain the published "posts"
            posts = await blog_service.getPublishedPosts();
        }

        // sort the published posts by postDate
        posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));

        // store the "posts" and "post" data in the viewData object (to be passed to the view)
        viewData.posts = posts;

    }catch(err){
        viewData.message = "no results";
    }

    try{
        // Obtain the post by "id"
        viewData.post = await blog_service.getPostById(req.params.id);
    }catch(err){
        viewData.message = "no results"; 
    }

    try{
        // Obtain the full list of "categories"
        let categories = await blog_service.getCategories();

        // store the "categories" data in the viewData object (to be passed to the view)
        viewData.categories = categories;
    }catch(err){
        viewData.categoriesMessage = "no results"
    }

    // render the "blog" view with all of the data (viewData)
    res.render("blog", {data: viewData})
});
app.get('/posts', (req, res) => {
    const category = req.query.category;
    const minDate = req.query.minDate;
    if (category) {
        blog_service.getPostsByCategory(Number(category)).then((data) => res.render("posts", {posts: data}))
        .catch((err) => res.render("posts", {message: err}));
    }
    else if (minDate) {
        blog_service.getPostsByMinDate(minDate).then((data) => res.render("posts", {posts: data}))
        .catch((err) => res.render("posts", {message: err}));
    }
    else {
        blog_service.getAllPosts().then((data) => res.render("posts", {posts: data}))
        .catch((err) => res.render("posts", {message: err}));
    }
})
app.get('/posts/add', (req, res) => {
    res.render('addPost');
})
app.post('/posts/add', (req, res) => {
    let streamUpload = (req) => {
        return new Promise((resolve, reject) => {
            let stream = cloudinary.uploader.upload_stream(
                (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
                }
            );
    
            streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
    };
    async function upload(req) {
        let result = await streamUpload(req);
        return result;
    }
    upload(req).then((uploaded)=>{
        req.body.featureImage = uploaded.url;
        blog_service.addPost(req.body)
        .then(() => {
            console.log("New post added")
            res.redirect('/posts')}); // redirect to posts
})})
app.get('/posts/:value', (req, res) => {
    blog_service.getPostById(Number(req.params.value)).then((data) => res.send(data))
    .catch((err) => {return {message: err}});
})
app.get('/categories', (req, res) => {
    blog_service.getCategories().then((data) => {res.render('categories', {categories:data})})
    .catch((err) => res.render('categories', {message:err}));
})
app.get('/posts/add', (req, res) => {
    res.sendFile(path.join(__dirname, "/views/addPost.html"));
})
app.get('*', (req, res) => {
    res.render('error404');
})

// start server if initialize is successful
try{
    blog_service.initialize().then(() => {
        app.listen(HTTP_PORT, () => { console.log(`Express http server listening on port ${HTTP_PORT}`) });
    })
}
catch {
    throw new Error("Could not initialize data set");
}
