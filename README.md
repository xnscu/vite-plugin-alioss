# vite-plugin-alioss

一个用于将Vite打包后的静态资源上传至阿里云OSS的Vite插件。

## 特性

- 自动上传打包后的静态资源到阿里云OSS
- 支持记忆功能，避免重复上传相同文件
- 灵活的配置选项，包括覆盖选项、测试模式等
- 可选删除本地文件及空目录

## 安装

```bash
npm install vite-plugin-alioss --save-dev
# 或
yarn add vite-plugin-alioss -D
# 或
pnpm add vite-plugin-alioss -D
```

## 使用方法

在`vite.config.js`中配置插件：

```javascript
import { defineConfig } from 'vite'
import alioss from 'vite-plugin-alioss'

export default defineConfig({
  plugins: [
    alioss({
      region: 'oss-cn-beijing', // OSS区域
      accessKeyId: 'your-access-key-id',
      accessKeySecret: 'your-access-key-secret',
      bucket: 'your-bucket-name',
      from: 'dist/**', // 要上传的文件匹配模式
      dist: 'assets', // OSS上的目标路径前缀
      // 更多配置...
    })
  ]
})
```

## 配置选项

| 参数 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `region` | `String` | - | 阿里云OSS区域 |
| `accessKeyId` | `String` | - | 阿里云AccessKey ID |
| `accessKeySecret` | `String` | - | 阿里云AccessKey Secret |
| `bucket` | `String` | - | OSS存储桶名称 |
| `from` | `String/Array` | - | 要上传的文件匹配模式 |
| `dist` | `String` | `''` | OSS上的目标路径前缀 |
| `test` | `Boolean` | `false` | 测试模式，不实际上传文件 |
| `verbose` | `Boolean` | `true` | 是否显示详细日志 |
| `buildRoot` | `String` | `'.'` | 构建输出根目录 |
| `deleteOrigin` | `Boolean` | `false` | 上传后是否删除本地文件 |
| `deleteEmptyDir` | `Boolean` | `false` | 是否删除上传后的空目录 |
| `timeout` | `Number` | `60000` | 上传超时时间(毫秒) |
| `overwrite` | `Boolean` | `false` | 是否覆盖已存在的文件 |
| `setOssPath` | `Function` | - | 自定义OSS路径生成函数 |
| `enableMemory` | `Boolean` | `true` | 是否启用记忆功能，避免重复上传 |
| `memoryFilePath` | `String` | `'node_modules/.oss-upload'` | 记忆文件存储路径 |
| `refresh` | `Boolean` | `false` | 是否忽略缓存强制重新上传 |
| `version` | `String` | - | 版本号 |
| `setVersion` | `Function` | - | 版本设置函数 |

## 高级用法

### 自定义OSS路径

通过`setOssPath`函数，您可以自定义文件上传到OSS的路径：

```javascript
alioss({
  // ...其他配置
  setOssPath: (filePath) => {
    // 基于文件路径返回自定义的OSS路径
    return `custom/path/${path.basename(filePath)}`;
  }
})
```

### 版本控制

使用`version`和`setVersion`实现版本控制：

```javascript
alioss({
  // ...其他配置
  version: '1.0.0',
  setVersion: async ({ version }) => {
    // 实现自定义版本更新逻辑
  }
})
```

## 环境变量

插件只在`NODE_ENV`为`production`时执行上传操作。

## 许可证

MIT