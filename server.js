var express = require('express');
var path = require('path');
var logger = require('morgan');
var compression = require('compression');
var methodOverride = require('method-override');
var session = require('express-session');
var flash = require('express-flash');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var dotenv = require('dotenv');
var exphbs = require('express-handlebars');
var passport = require('passport');
var imageFilter = require('./controllers/api').imageFilter;
var multer = require('multer');
var upload = multer({ dest: 'uploads/', fileFilter: imageFilter });
var expstate = require('express-state');
// Load environment variables from .env file
dotenv.load();

// Controllers
var HomeController = require('./controllers/home');
var userController = require('./controllers/user');
var contactController = require('./controllers/contact');
var apiController = require('./controllers/api');

// Passport OAuth strategies
require('./config/passport');

var app = express();


var hbs = exphbs.create({
    defaultLayout: 'main',
    helpers: {
        ifeq: function(a, b, options) {
            if (a === b) {
                return options.fn(this);
            }
            return options.inverse(this);
        },
        toJSON: function(object) {
            return JSON.stringify(object);
        }
    }
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('port', process.env.PORT || 3000);
app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressValidator());
app.use(methodOverride('_method'));
app.use(session({ secret: process.env.SESSION_SECRET, resave: true, saveUninitialized: true }));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(function(req, res, next) {
    res.locals.user = req.user ? req.user.toJSON() : null;
    next();
});
app.use(express.static(path.join(__dirname, 'public')));
expstate.extend(app);
app.set("state namespace", 'App');

app.get('/', HomeController.index);
app.get('/contact', contactController.contactGet);
app.post('/contact', contactController.contactPost);
app.get('/account', userController.ensureAuthenticated, userController.accountGet);
app.put('/account', userController.ensureAuthenticated, userController.accountPut);
app.delete('/account', userController.ensureAuthenticated, userController.accountDelete);
app.get('/signup', userController.signupGet);
app.post('/signup', userController.signupPost);
app.get('/login', userController.loginGet);
app.post('/login', userController.loginPost);
app.get('/forgot', userController.forgotGet);
app.post('/forgot', userController.forgotPost);
app.get('/reset/:token', userController.resetGet);
app.post('/reset/:token', userController.resetPost);
app.get('/logout', userController.logout);
app.get('/unlink/:provider', userController.ensureAuthenticated, userController.unlink);
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_location'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' }));
app.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
app.get('/auth/google/callback', passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login' }));
app.post('/api/tree/infected', upload.array('picture'), apiController.infectedTree);
app.post('/api/tree/saved', upload.array('picture'), apiController.savedTree);
app.post('/api/trees', upload.array('picture'), apiController.getTrees);
app.get('/api/me', apiController.me);
app.post('/api/tree/info', apiController.treeInfo);
app.post('/api/user/info', apiController.userInfo);

// Production error handler
if (app.get('env') === 'production') {
    app.use(function(err, req, res, next) {
        console.error(err.stack);
        res.sendStatus(err.status || 500);
    });
}

app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});

module.exports = app;
