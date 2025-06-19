const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  saldo: {
    type: Number,
    default: 0  // saldo inicial
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
