const cloud = require('wx-server-sdk');
const crypto = require('crypto');

// 初始化云开发环境
try {
  cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
  });
} catch (error) {
  console.error('云函数初始化失败:', error);
  return {
    success: false,
    error: '云函数初始化失败'
  };
}

const db = cloud.database();

// 密码加密函数
function encryptPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 检查并创建集合
async function ensureCollectionExists() {
  try {
    // 尝试获取集合信息，如果不存在会抛出错误
    await db.collection('users').get();
  } catch (error) {
    if (error.errCode === -502005) { // 集合不存在的错误码
      console.log('users 集合不存在，尝试创建...');
      try {
        await db.createCollection('users');
        console.log('users 集合创建成功');
      } catch (createError) {
        console.error('创建集合失败:', createError);
        throw createError;
      }
    } else {
      throw error;
    }
  }
}

exports.main = async (event, context) => {
  const { username, password, nickname } = event;
  
  console.log('注册请求参数:', { username, nickname });
  
  try {
    // 确保集合存在
    await ensureCollectionExists();
    
    // 检查用户名是否已存在
    const checkResult = await db.collection('users')
      .where({
        username: username
      })
      .count();
    
    console.log('用户名检查结果:', checkResult);
    
    if (checkResult.total > 0) {
      return {
        success: false,
        error: '用户名已存在'
      };
    }
    
    // 创建新用户
    const userData = {
      username: username,
      password: encryptPassword(password),
      nickname: nickname || username,
      createTime: db.serverDate(),
      lastLoginTime: db.serverDate(),
      avatar: '' // 默认头像
    };
    
    console.log('准备创建用户:', userData);
    
    const result = await db.collection('users')
      .add({
        data: userData
      });
    
    console.log('用户创建结果:', result);
    
    return {
      success: true,
      userId: result._id
    };
  } catch (error) {
    console.error('注册失败:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return {
      success: false,
      error: '注册失败，请稍后重试'
    };
  }
}; 