const { HttpsProxyAgent } = require("https-proxy-agent");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const readline = require("readline");

const WAITTIME = 2800; // Wait time between each run (seconds)

class Bunny {
  constructor() {
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://got.bondex.app",
      Referer: "https://got.bondex.app/",
      "Sec-Ch-Ua":
        '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    };
    this.line = "~".repeat(42).white;
  }

  async http(url, headers, data = null, proxy = null, method = "GET") {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const options = { headers };
        if (proxy) {
          options.httpsAgent = new HttpsProxyAgent(proxy);
        }
        let res;
        switch (method) {
          case "GET":
            res = await axios.get(url, options);
            break;
          case "POST":
            res = await axios.post(url, data, options);
            break;
          case "PUT":
            res = await axios.put(url, data, options);
            break;
          case "DELETE":
            res = await axios.delete(url, options);
            break;
          default:
            throw new Error("Invalid method!");
        }
        if (typeof res.data !== "object") {
          this.log("Did not receive a valid JSON response!".red);
          attempts++;
          await this.sleep(2000);
          continue;
        }
        return res;
      } catch (error) {
        attempts++;
        this.log(
          `Connection error (Attempt ${attempts}/${maxAttempts}): ${error.message}`
            .red
        );
        if (attempts < maxAttempts) {
          await this.sleep(5000);
        } else {
          break;
        }
      }
    }
    throw new Error("Unable to connect after 3 attempts");
  }

  async waitWithCountdown(seconds) {
    for (let i = seconds; i >= 0; i--) {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(
        `===== Completed all accounts, waiting ${i} seconds to continue the loop =====`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log("");
  }

  async checkProxyIP(proxy) {
    try {
      const proxyAgent = new HttpsProxyAgent(proxy);
      const response = await axios.get("https://api.myip.com/", {
        httpsAgent: proxyAgent,
      });
      if (response.status === 200) {
        return response.data.ip;
      } else {
        this.log(`❌ Error checking proxy IP: ${error.message}`.red);
      }
    } catch (error) {
      this.log(`❌ Error checking proxy IP: ${error.message}`.red);
    }
  }

  log(msg) {
    console.log(`[*] ${msg}`);
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async title() {
    console.clear();
    console.log(
      colors.yellow(
        "This tool was made by Zepmo. If you like it, please support me with a ref!"
      )
    );
    console.log(
      colors.blue("Contact Telegram: https://web.telegram.org/k/#@zepmoo \n")
    );
  }

  async login(data, proxy) {
    const url = "https://backend.got.bondex.app/authorize";

    try {
      const res = await this.http(url, this.headers, data, proxy, "POST");
      if (res?.data?.access_token) {
        return res.data.access_token;
      } else {
        this.log(`❌ Login failed! : ${res?.data?.messages}`.red);
        return null;
      }
    } catch (error) {
      this.log(`❌ Login failed! : ${error.message}`.red);
    }
  }

  async getMe(token, proxy) {
    const url = "https://backend.got.bondex.app/getMe";
    const header = {
      ...this.headers,
      "x-api-key": token,
    };
    try {
      const res = await this.http(url, header, null, proxy, "GET");
      if (res?.data?.access_token) {
        return res.data;
      } else {
        this.log(
          `❌ Failed to retrieve account information! : ${res?.data?.messages}`
            .red
        );
        return null;
      }
    } catch (error) {
      this.log(
        `❌ Failed to retrieve account information! : ${error.message}`.red
      );
    }
  }

  async mine(token, proxy, taps) {
    const url = "https://backend.got.bondex.app/mine";
    const header = {
      ...this.headers,
      "x-api-key": token,
    };
    const data = {
      count: taps,
    };
    try {
      const res = await this.http(url, header, data, proxy, "POST");
      if (res?.data?.balance) {
        this.log(
          `✅ Tap successful! Balance: ${res.data.balance} | Remaining Energy: ${res.data.newEnergy}`
            .green
        );
      } else {
        this.log(`❌ Tap failed! : ${res?.data?.messages}`.red);
        return null;
      }
    } catch (error) {
      this.log(`❌ Tap failed! : ${error.message}`.red);
    }
  }

  async dailyReward(token, proxy) {
    const url = "https://backend.got.bondex.app/getDailyBonuses";
    const urlReward = "https://backend.got.bondex.app/pickDailyBonus";
    const header = {
      ...this.headers,
      "x-api-key": token,
    };
    try {
      const res = await this.http(url, header, null, proxy, "GET");
      if (res?.data?.has_available) {
        const response = await this.http(
          urlReward,
          header,
          null,
          proxy,
          "POST"
        );
        if (response?.data?.balance) {
          this.log(
            `✅ Daily reward successfully claimed! Balance: ${response.data.balance}`
              .green
          );
        } else {
          this.log(
            `❌ Failed to claim daily reward! : ${response?.data?.messages}`.red
          );
          return null;
        }
      } else {
        this.log("Already checked in today!".yellow);
        return null;
      }
    } catch (error) {
      this.log(`❌ Failed to claim daily reward! : ${error.message}`.red);
    }
  }

  async main() {
    await this.title();
    const dataFile = path.join(__dirname, "data.txt");
    const data = fs
      .readFileSync(dataFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);

    const proxyFile = path.join(__dirname, "proxy.txt");
    const proxyList = fs
      .readFileSync(proxyFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);

    if (data.length <= 0) {
      this.log("No accounts added!".red);
      process.exit();
    }

    if (proxyList.length <= 0) {
      this.log("No proxies added!".red);
      process.exit();
    }

    if (data.length !== proxyList.length) {
      this.log("The number of accounts and proxies do not match!".red);
      process.exit();
    }

    while (true) {
      for (const [index, tgData] of data.entries()) {
        const proxy = proxyList[index];
        const userData = JSON.parse(
          decodeURIComponent(tgData.split("&")[1].split("=")[1])
        );
        const firstName = userData.first_name;
        const ip = await this.checkProxyIP(proxy);
        console.log(
          `========== Account ${index + 1}/${data.length} | ${
            firstName?.green
          } | IP: ${ip} ==========`
        );
        const token = await this.login(tgData, proxy);
        if (token) {
          this.log(`✅ Login successful!`.green);
          const user = await this.getMe(token, proxy);
          if (user) {
            this.log(
              `Balance: ${user.balance} | Remaining Energy: ${user.energy}`
                .yellow
            );
            await this.mine(
              token,
              proxy,
              parseInt(user.energy / user.earn_per_tap)
            );
            await this.dailyReward(token, proxy);
          }
        }
      }
      await this.waitWithCountdown(WAITTIME);
    }
  }
}

if (require.main === module) {
  process.on("SIGINT", () => {
    process.exit();
  });
  new Bunny().main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
