const mogoose = require('mongoose')

const UserSchema = new mogoose.Schema({
    username : {type:String,unique:true},
    password : String,

},{timestamps:true})


const UserModel = mogoose.model('User',UserSchema);

module.exports = UserModel;