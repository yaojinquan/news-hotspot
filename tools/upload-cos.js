const path = require('path');
const fs = require('fs');

const COS_BUCKET = process.env.COS_BUCKET;
const COS_REGION = process.env.COS_REGION || 'ap-guangzhou';
const COS_SECRET_ID = process.env.COS_SECRET_ID;
const COS_SECRET_KEY = process.env.COS_SECRET_KEY;

const usage = () => {
  console.log('用法（需先 npm i cos-nodejs-sdk-v5）:');
  console.log('  COS_BUCKET=<桶名> COS_REGION=ap-guangzhou \\');
  console.log('  COS_SECRET_ID=xxx COS_SECRET_KEY=yyy \\');
  console.log('  node tools/upload-cos.js [本地文件路径] [远程对象键]');
  console.log('');
  console.log('默认上传 miniprogram/data/data.json -> data.json');
  process.exit(1);
};

if (!COS_BUCKET || !COS_SECRET_ID || !COS_SECRET_KEY) {
  console.error('缺少环境变量 COS_BUCKET / COS_SECRET_ID / COS_SECRET_KEY');
  usage();
}

const localFile = process.argv[2] || path.join(__dirname, '..', 'miniprogram', 'data', 'data.json');
const remoteKey = process.argv[3] || 'data.json';

if (!fs.existsSync(localFile)) {
  console.error('文件不存在:', localFile);
  process.exit(1);
}

const COS = require('cos-nodejs-sdk-v5');
const cos = new COS({
  SecretId: COS_SECRET_ID,
  SecretKey: COS_SECRET_KEY
});

cos.putObject({
  Bucket: COS_BUCKET,
  Region: COS_REGION,
  Key: remoteKey,
  Body: fs.createReadStream(localFile),
  ContentType: 'application/json; charset=utf-8',
  CacheControl: 'max-age=60'
}, (err, data) => {
  if (err) {
    console.error('上传失败:', err.message || err);
    process.exit(1);
  }
  const url = `https://${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com/${remoteKey}`;
  console.log('上传成功:', url);
  console.log('HTTP', data.statusCode);
});
