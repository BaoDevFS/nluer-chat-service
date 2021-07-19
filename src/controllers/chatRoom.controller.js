import makeValidation from '@withvoid/make-validation';
import ChatRoomModel from '../models/chatRoom.model';
import MessageModel from '../models/message.model';
import UserModel from '../models/user.model';

export default {
  initiate: async (req, res) => {
    try {
      const validation = makeValidation((types) => ({
        payload: req.body,
        checks: {
          members: {
            type: types.array,
            options: { unique: true, empty: false, stringOnly: true },
          },
          type: { type: types.boolean },
        },
      }));
      if (!validation.success) return res.status(400).json({ ...validation });

      const { userIds, type } = req.body;
      const { userId: chatInitiator } = req;
      const allUserIds = [...userIds, chatInitiator];
      const chatRoom = await ChatRoomModel.initiateChat(allUserIds, type, chatInitiator);
      return res.status(200).json({ success: true, chatRoom });
    } catch (error) {
      return res.status(500).json({ success: false, error });
    }
  },
  postMessage: async (req, res) => {
    try {
      const { roomId } = req.params;
      const validation = makeValidation((types) => ({
        payload: req.body,
        checks: {
          messageText: { type: types.string },
        },
      }));
      if (!validation.success) return res.status(400).json({ ...validation });

      const messagePayload = {
        messageText: req.body.messageText,
      };
      const currentLoggedUser = req.userId;
      const post = await MessageModel.sendMessage(roomId, messagePayload, currentLoggedUser);
      global.io.sockets.in(roomId).emit('new message', { message: post });
      return res.status(200).json({ success: true, post });
    } catch (error) {
      return res.status(500).json({ success: false, error });
    }
  },
  getRecentConversation: async (req, res) => {
    try {
      const currentLoggedUser = req.userId;
      const options = {
        page: parseInt(req.query.page, 10) || 0,
        limit: parseInt(req.query.limit, 10) || 10,
      };
      const rooms = await ChatRoomModel.getChatRoomsByUserId(currentLoggedUser);
      const roomIds = rooms.map((room) => room._id);
      const recentConversation = await MessageModel.getRecentConversation(roomIds, options, currentLoggedUser);
      return res.status(200).json({ success: true, conversation: recentConversation });
    } catch (error) {
      return res.status(500).json({ success: false, error });
    }
  },
  getConversationByRoomId: async (req, res) => {
    try {
      const { roomId } = req.params;
      const room = await ChatRoomModel.getChatRoomByRoomId(roomId);
      if (!room) {
        return res.status(400).json({
          success: false,
          message: 'No room exists for this id',
        });
      }
      const users = await UserModel.getUserByIds(room.userIds);
      const options = {
        page: parseInt(req.query.page, 10) || 0,
        limit: parseInt(req.query.limit, 10) || 10,
      };
      const conversation = await MessageModel.getConversationByRoomId(roomId, options);
      return res.status(200).json({
        success: true,
        conversation,
        users,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error });
    }
  },
  markConversationReadByRoomId: async (req, res) => {
    try {
      const { roomId } = req.params;
      const room = await ChatRoomModel.getChatRoomByRoomId(roomId);
      if (!room) {
        return res.status(400).json({
          success: false,
          message: 'No room exists for this id',
        });
      }

      const currentLoggedUser = req.userId;
      const result = await MessageModel.markMessageRead(roomId, currentLoggedUser);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({ success: false, error });
    }
  },
};
