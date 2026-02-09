const fs = require('fs')
const path = require('path')
const { glob } = require('glob')
const colors = require('colors')
const { red, blue, green, underline, yellow, white } = colors
const OSS = require('ali-oss')

// 添加一个全局变量来存储已上传的文件URL
const uploadedFiles = new Set()

const normalize = (url) => {
  const tmpArr = url.split(/\/{2,}/);
  if (tmpArr.length > 2) {
    const [protocol, ...rest] = tmpArr;
    url = protocol + '//' + rest.join('/');
  }
  return url;
};

const slash = (path) => {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path);
  const hasNonAscii = /[^\u0000-\u0080]+/.test(path); // eslint-disable-line no-control-regex
  if (isExtendedLengthPath || hasNonAscii) {
    return path;
  }
  return path.replace(/\\/g, '/');
};

const defaultOption = {
  test: false,
  verbose: true,
  dist: '',
  buildRoot: '.',
  deleteOrigin: false,
  deleteEmptyDir: false,
  timeout: 60 * 1000,
  overwrite: false,
  quitWpOnError: false,
  enableMemory: true,                // 启用记忆功能
  memoryFilePath: 'node_modules/.oss-upload', // 持久化记忆文件夹路径
  refresh: false,                    // 忽略记忆和OSS已存在的情况，强制重新上传
  retryCount: 3                      // 上传失败时的重试次数，0 表示不重试
}

const assetUploaderPlugin = (options) => {
  const oss = new OSS({
    region: options.region,
    accessKeyId: options.accessKeyId,
    accessKeySecret: options.accessKeySecret,
    bucket: options.bucket
  })
  const {
    from,
    dist,
    deleteOrigin,
    deleteEmptyDir,
    setOssPath,
    timeout,
    verbose,
    test,
    overwrite,
    version,
    setVersion,
    enableMemory,
    memoryFilePath,
    refresh,
    retryCount
  } = Object.assign(defaultOption, options)

  // 从文件加载上传记录
  const loadMemoryFromFile = () => {
    const memoryFile = path.join(memoryFilePath, '.oss-memory.json')

    if (fs.existsSync(memoryFile)) {
      try {
        const memoryData = JSON.parse(fs.readFileSync(memoryFile, 'utf-8'))
        memoryData.forEach(url => uploadedFiles.add(url))
        verbose && console.log(green(`已从 ${memoryFile} 加载 ${memoryData.length} 条上传记录`))
      } catch (err) {
        console.log(red(`加载上传记录失败: ${err.message}`))
      }
    }
  }

  // 保存上传记录到文件
  const saveMemoryToFile = () => {
    try {
      // 确保目录存在
      if (!fs.existsSync(memoryFilePath)) {
        fs.mkdirSync(memoryFilePath, { recursive: true })
      }

      const memoryFile = path.join(memoryFilePath, '.oss-memory.json')

      fs.writeFileSync(
        memoryFile,
        JSON.stringify(Array.from(uploadedFiles)),
        'utf-8'
      )
      verbose && console.log(green(`已将 ${uploadedFiles.size} 条上传记录保存到 ${memoryFile}`))
    } catch (err) {
      console.log(red(`保存上传记录失败: ${err.message}`))
    }
  }

  // 初始化时加载记忆数据
  if (enableMemory) {
    loadMemoryFromFile()
  }

  /**
   * 上传文件
   * @param files 所有需要上传的文件的路径列表
   * @param inVite 是否是vite
   * @param outputPath 需要上传的文件目录路径（打包输入目录路径）
   */
  const upload = async (files, inVite, outputPath = '') => {
    // 是否测试模式
    if (test) {
      console.log(green(`\n Currently running in test mode. your files won't realy be uploaded.\n`))
    } else {
      console.log(green(`\n Your files will be uploaded very soon.\n`))
    }
    // 设置文件路径信息
    const _files = files.map(file => ({
      path: file,
      fullPath: path.resolve(file)
    }))
    const filesUploaded = []  // 已上传文件列表
    const filesIgnored = [] // 已忽略的文件列表
    const filesErrors = []  // 上传失败文件列表
    const filesCached = [] // 因记忆功能而跳过的文件列表

    const basePath = getBasePath(inVite, outputPath)
    const fileCount = _files.length
    for (let i = 0; i < fileCount; i++) {
      const file = _files[i]
      const { fullPath: filePath, path: fPath } = file
      // 为每个文件设置上传的绝对路径
      const ossFilePath = await slash(
        path.join(
          dist,
          (
            setOssPath && setOssPath(filePath)
            || basePath && filePath.split(basePath)[1]
            || ''
          )
        )
      )

      // 检查是否已在已上传文件列表中
      if (enableMemory && !refresh && uploadedFiles.has(ossFilePath)) {
        console.log(yellow(`文件 ${underline(ossFilePath)} 已在记忆中，跳过上传`))
        filesCached.push(filePath)
        continue
      }

      // 查看OSS中是否存在该文件
      const fileExists = await getFileExists(ossFilePath)
      console.log(yellow(`oss中 ${underline(ossFilePath)} ${fileExists ? '已存在' : '不存在'}`))

      // OSS已有该文件且不需覆盖，且不强制刷新，则将文件加入忽略名单
      if (fileExists && !overwrite && !refresh) {
        filesIgnored.push(filePath)
        uploadedFiles.add(ossFilePath)
        continue
      }
      // 测试模式
      if (test) {
        console.log(blue(fPath), `is ready to upload to ${green(ossFilePath)} \n`)
        continue
      }

      try {
        verbose && console.log(`\n ${i + 1}/${fileCount} ${white(underline(fPath))} uploading...`)

        let result
        const maxAttempts = Math.max(0, retryCount) + 1
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            result = await oss.put(ossFilePath, filePath, {
              timeout,
              headers: !overwrite ? { "Cache-Control": "max-age=31536000", 'x-oss-forbid-overwrite': true } : {}
            })
            break
          } catch (err) {
            if (attempt < maxAttempts) {
              verbose && console.log(yellow(`上传失败，${maxAttempts - attempt} 次重试剩余，1秒后重试...`))
              await new Promise(r => setTimeout(r, 1000))
            } else {
              throw err
            }
          }
        }

        result.url = normalize(result.url)
        filesUploaded.push(fPath)
        // 添加到已上传文件列表
        if (enableMemory) {
          uploadedFiles.add(ossFilePath)
        }
        verbose && console.log(`\n ${i + 1}/${fileCount} ${blue(underline(fPath))} successfully uploaded, oss url =>  ${green(underline(result.url))}`)

        if (deleteOrigin) {
          fs.unlinkSync(filePath)
          if (deleteEmptyDir && files.every(f => f.indexOf(path.dirname(filePath)) === -1)) {
            cleanEmptyDir(filePath)
          }
        }
      } catch (err) {
        filesErrors.push({
          file: fPath,
          err: { code: err.code, message: err.message, name: err.name }
        })

        const errorMsg = red(`\n Failed to upload ${underline(fPath)}: ${err.name}-${err.code}: ${err.message}`)
        console.log(red(errorMsg))
      }
    }
    try {
      if (setVersion && version && !test) {
        await setVersion({ version: version })
        console.log('更新版本号')
      }
    } catch (err) {
      console.log(red(`更新版本号出错了...`))
    }

    // 打印上传统计信息
    if (verbose && !test) {
      console.log()
      console.log(green('\n上传任务完成，统计信息：'))
      console.log(blue(`总文件数: ${fileCount}`))
      console.log(green(`成功上传: ${filesUploaded.length}`))
      console.log(yellow(`跳过上传 (OSS已存在): ${filesIgnored.length}`))
      console.log(yellow(`跳过上传 (记忆功能): ${filesCached.length}`))
      console.log(red(`上传失败: ${filesErrors.length}`))
    }

    // 保存记忆数据到文件
    if (enableMemory) {
      saveMemoryToFile()
    }
  }

  /**
   * 获取文件的绝对路径
   * @param inVite 是否为vite
   * @param outputPath 需要上传的文件目录路径（打包输入目录路径）
   * @returns
   */
  const getBasePath = (inVite, outputPath) => {
    if (setOssPath) return ''
    let basePath = ''
    if (inVite) {
      if (path.isAbsolute(outputPath)) basePath = outputPath
      else basePath = path.resolve(outputPath)
    } else {
      const buildRoot = options.buildRoot
      if (path.isAbsolute(buildRoot)) basePath = buildRoot
      else basePath = path.resolve(buildRoot)
    }
    return slash(basePath)
  }

  /**
   * 根据文件路径判断OSS中是否存在该文件
   * @param filepath OSS中的文件路径
   * @returns
   */
  const getFileExists = async (filepath) => {
    return oss.get(filepath)
      .then((result) => {
        return result.res.status == 200
      }).catch((e) => {
        if (e.code == 'NoSuchKey') return false
      })
  }

  /**
   * 清空目录
   * @param filePath 文件路径
   */
  const cleanEmptyDir = (filePath) => {
    const dirname = path.dirname(filePath)
    if (fs.existsSync(dirname) && fs.statSync(dirname).isDirectory()) {
      fs.readdir(dirname, (err, files) => {
        if (err) console.error(err)
        else {
          if (!files.length) {
            fs.rmdir(dirname, (err) => {
              if (err) {
                console.log(red(err))
              } else {
                verbose && console.log(green('empty directory deleted'), dirname)
              }
            })
          }
        }
      })
    }
  }
  let outputPath = ''
  return {
    name: 'vite-plugin-oss',
    // 在解析 Vite 配置后调用。使用这个钩子读取和存储最终解析的配置。当插件需要根据运行的命令做一些不同的事情时，它也很有用。
    configResolved: async (config) => {
      // 获取需要上传的文件目录路径
      outputPath = path.resolve(slash(config.build.outDir))
    },
    // 打包完成后执行上传
    closeBundle: async () => {
      // 获取需要上传的文件目录路径的所有文件的路径列表
      if (process.env.NODE_ENV !== 'production') {
        return console.log(yellow(`NODE_ENV为${process.env.NODE_ENV}, 不执行上传`))
      }
      const files = glob.sync(from, { nodir: true })

      if (files.length) {
        try {
          await upload(files, true, outputPath)
        } catch (err) {
          console.log(red(err))
        }
      } else {
        verbose && console.log(red(`no files to be uploaded`))
      }
    }
  }
}
module.exports = assetUploaderPlugin