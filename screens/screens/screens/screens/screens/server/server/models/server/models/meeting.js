// server/models/Meeting.js
const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  topic: { type: String, required: true },
  hostId: { type: String, required: true },
  hostName: { type: String, required: true },
  type: { type: String, enum: ['video', 'voice'], default: 'video' },
  maxParticipants: { type: Number, default: 10000 },
  participants: [{
    id: String,
    name: String,
    role: { type: String, enum: ['host', 'participant'] },
    joinedAt: Date,
  }],
  status: { type: String, enum: ['scheduled', 'active', 'ended'], default: 'scheduled' },
  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  endedAt: Date,
});

module.exports = mongoose.model('Meeting', MeetingSchema);
