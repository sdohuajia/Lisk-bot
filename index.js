const { Web3 } = require("web3");
const kleur = require("kleur");
const fetch = require('node-fetch'); 
const fs = require('fs');

// 设置进程标题
process.title = "Lisk自动签到--ferdie_jhovie编写";

// 配置
const RPC_URL = "https://rpc.api.lisk.com";
const CHECKIN_API_URL = "https://portal-api.lisk.com/graphql";

// 读取私钥和代理
function loadConfig() {
  try {
    // 读取私钥文件
    const privateKeys = fs.existsSync('./address.txt') 
      ? fs.readFileSync('./address.txt', 'utf8').split('\n').filter(line => line.trim())
      : [];
    
    // 读取代理文件
    const proxies = fs.existsSync('./proxy.txt')
      ? fs.readFileSync('./proxy.txt', 'utf8').split('\n').filter(line => line.trim())
      : [];

    if (privateKeys.length === 0) {
      throw new Error("address.txt 文件为空或不存在");
    }

    // 将私钥和代理组合成配置对象数组
    return privateKeys.map((pk, index) => ({
      privateKey: pk.trim(),
      proxy: proxies[index]?.trim() || null // 如果没有对应代理则为null
    }));
  } catch (error) {
    console.error(kleur.red("读取配置文件错误:"), error);
    return [];
  }
}

// 创建fetch请求
async function createFetchRequest(url, options, proxy) {
  if (!proxy) {
    return fetch(url, options);
  }

  // 使用代理发送请求
  return fetch(url, {
    ...options,
    proxy: proxy // 格式: "http://ip:port" 或 "http://username:password@ip:port"
  });
}

// 检查是否已经在今天执行过签到
function hasCheckedInToday() {
  try {
    const logFile = './checkin_log.txt';
    if (!fs.existsSync(logFile)) return false;
    
    const lastCheckin = fs.readFileSync(logFile, 'utf8');
    const today = new Date().toISOString().split('T')[0];
    return lastCheckin.includes(today);
  } catch (error) {
    return false;
  }
}

// 记录签到日期
function logCheckinDate() {
  const logFile = './checkin_log.txt';
  const date = new Date().toISOString().split('T')[0];
  fs.appendFileSync(logFile, `${date}\n`);
}

// 每日签到函数
async function dailyCheckin() {
  const configs = loadConfig();
  if (configs.length === 0) {
    throw new Error("未找到有效的私钥配置");
  }

  const web3 = new Web3(RPC_URL);
  
  const accounts = configs.map(config => {
    const account = web3.eth.accounts.privateKeyToAccount("0x" + config.privateKey);
    web3.eth.accounts.wallet.add(account);
    return {
      account,
      proxy: config.proxy
    };
  });

  try {
    const results = await Promise.all(
      accounts.map(async ({ account, proxy }) => {
        try {
          const response = await createFetchRequest(
            CHECKIN_API_URL,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: `
                  mutation UpdateAirdropTaskStatus($input: UpdateTaskStatusInputData!) {
                    userdrop {
                      updateTaskStatus(input: $input) {
                        success
                        progress {
                          isCompleted
                          completedAt
                        }
                      }
                    }
                  }
                `,
                variables: {
                  input: {
                    address: account.address,
                    taskID: 1,
                  },
                },
              }),
            },
            proxy
          );

          if (!response.ok) {
            throw new Error(`HTTP 错误: ${response.status}`);
          }

          const data = await response.json();
          
          console.log(
            kleur.green(`账户 ${account.address} 签到成功`) +
            (proxy ? kleur.blue(` (使用代理: ${proxy})`) : kleur.blue(" (直连)"))
          );
          return response;
        } catch (accountError) {
          console.error(
            kleur.yellow(`账户 ${account.address} 签到失败: `),
            accountError
          );
          return null;
        }
      })
    );

    const successfulResults = results.filter((result) => result !== null);
    console.log(
      kleur.green(
        `每日签到完成，成功签到账户数: ${successfulResults.length}/${accounts.length}`
      )
    );
  } catch (error) {
    console.error(kleur.red("每日签到致命错误: "), error);
  }
}

// 主函数
async function main() {
  console.log(kleur.blue("签到程序已启动，等待执行..."));
  
  // 检查是否需要立即执行一次
  if (!hasCheckedInToday()) {
    console.log(kleur.yellow("执行首次签到..."));
    await dailyCheckin();
    logCheckinDate();
  }

  // 设置定时器，每小时检查一次
  setInterval(async () => {
    // 获取当前时间
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // 如果是凌晨0点到1点之间，且今天还没有签到
    if (hours === 0 && !hasCheckedInToday()) {
      console.log(kleur.yellow(`\n${now.toLocaleString()} - 开始执行每日签到`));
      await dailyCheckin();
      logCheckinDate();
    }
  }, 60 * 60 * 1000); // 每小时检查一次
}

// 添加优雅退出处理
process.on('SIGINT', () => {
  console.log(kleur.yellow('\n正在退出程序...'));
  process.exit();
});

// 运行主函数
main().catch(error => {
  console.error(kleur.red("程序运行错误: "), error);
});
