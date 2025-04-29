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

exports.main = async (event, context) => {
  const { username, password } = event;
  
  console.log('登录请求参数:', { username });
  
  try {
    // 查询用户
    const userResult = await db.collection('users')
      .where({
        username: username,
        password: encryptPassword(password)
      })
      .get();
    
    console.log('用户查询结果:', userResult);
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户名或密码错误'
      };
    }
    
    const user = userResult.data[0];
    
    // 生成token
    const token = crypto.randomBytes(32).toString('hex');
    
    // 更新用户token
    await db.collection('users')
      .doc(user._id)
      .update({
        data: {
          token: token,
          lastLoginTime: db.serverDate()
        }
      });
    
    return {
      success: true,
      token: token,
      userInfo: {
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar
      }
    };
  } catch (error) {
    console.error('登录失败:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return {
      success: false,
      error: '登录失败，请稍后重试'
    };
  }
}; 