import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite';
import vitePluginOss from './index.js'
import * as dotenv from "dotenv";
dotenv.config()

const VITE_APP_NAME = 'test'
const isProdution = process.env.NODE_ENV == "production"
const PROD_URL = `https://${process.env.ALIOSS_BUCKET}.${process.env.ALIOSS_REGION}.aliyuncs.com/${VITE_APP_NAME}/`;

const baseUrl = isProdution ? PROD_URL : "/";

export default defineConfig({
  base: baseUrl,
  plugins: [
    vue(),
    vitePluginOss({
      from: './dist/**/*', // 上传那个文件或文件夹  可以是字符串或数组
      dist: `/${VITE_APP_NAME}`,  // 需要上传到oss上的给定文件目录
      region: process.env.ALIOSS_REGION,
      accessKeyId: process.env.ALIOSS_KEY,
      accessKeySecret: process.env.ALIOSS_SECRET,
      bucket: process.env.ALIOSS_BUCKET,
      // 因为文件标识符 "\"  和 "/" 的区别 不进行 setOssPath配置,上传的文件夹就会拼到文件名上, 丢失了文件目录,所以需要对setOssPath 配置。
      setOssPath: (filePath) => {
        const index = filePath.lastIndexOf("dist");
        const Path = filePath.substring(index + 4, filePath.length);
        return Path.replace(/\\/g, "/");
      },
      test: false,
    })
  ]
})