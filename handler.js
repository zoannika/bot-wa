const moment = require("moment-timezone");
const fs = require("fs");
const fetch = require("node-fetch");
const { exec } = require("child_process");
const { serialize } = require("akiraa-js");
const {
  WAMessageStubType,
  generateWAMessage,
  areJidsSameUser,
  getAggregateVotesInPollMessage,
  proto,
  jidNormalizedUser,
} = require("akiraa-baileys");
const chalk = require("chalk");
const util = require("util");
const { protoType } =  require(process.cwd() + "/lib/protoType");
const isNumber = (x) => typeof x === "number" && !isNaN(x);
const delay = (ms) =>
  isNumber(ms) && new Promise((resolve) => setTimeout(resolve, ms));

module.exports = async(msg, store, conn, chatUpdate) => {
    conn.msgqueque = conn.msgqueque || [];
   await protoType()
    try {
    let m = msg;
      m.exp = 0;
      m.limit = false;
   
      try {      
        require("./lib/database.js")(m);
      } catch (e) {
          if (/(returnoverlimit|timed|timeout|users|item|time)/ig.test(e.message)) return
        console.error(e);
      }
      const isROwner = [
        conn.decodeJid(conn.user.id),
        ...global.owner.map((a) => a + "@s.whatsapp.net"),
      ].includes(m.sender);
      const isOwner = isROwner || m.fromMe;
      const isMods = global.db.data.users[m.sender].moderator;
      const isPrems = global.db.data.users[m.sender].premium;
      const isBans = global.db.data.users[m.sender].banned;
      const isWhitelist = global.db.data.chats[m.chat].whitelist;
      if (m.isGroup) {
        let member = await (
          await store.fetchGroupMetadata(m.chat, conn)
        ).participants.map((a) => a.id);
        db.data.chats[m.chat].member = member;
        db.data.chats[m.chat].chat += 1;
      }
 
      if (isROwner) {
        db.data.users[m.sender].premium = true;
        db.data.users[m.sender].premiumDate = "PERMANENT";
        db.data.users[m.sender].limit = "PERMANENT";
        db.data.users[m.sender].moderator = true;
      } else if (isPrems) {
        db.data.users[m.sender].limit = "PERMANENT";
      } else if (!isROwner && isBans) return;

      if (opts["queque"] && m.text && !(isMods || isPrems)) {
        let queque = conn.msgqueque,
          time = 1000 * 5;

        const previousID = queque[queque.length - 1];
        queque.push(m.id || m.key.id);
        setInterval(async function () {
          if (queque.indexOf(previousID) === -1) clearInterval(conn);
          else await delay(time);
        }, time);
      }
      db.data.users[m.sender].online = new Date() * 1;
      db.data.users[m.sender].chat += 1;
      if (opts["autoread"]) await conn.readMessages([m.key]);
      if (opts["nyimak"]) return;
      if (
        !m.fromMe &&
        !isOwner &&
        !isPrems &&
        !isMods &&
        !isWhitelist &&
        opts["self"]
      )
        return;
      if (opts["pconly"] && m.chat.endsWith("g.us")) return;
      if (opts["gconly"] && !m.fromMe && !m.chat.endsWith("g.us")) return;
      if (opts["swonly"] && m.chat !== "status@broadcast") return;

      if (typeof m.text !== "string") m.text = "";
      if (m.isBaileys) return;
      m.exp += Math.ceil(Math.random() * 1000);

      let usedPrefix;
      let _user =
        global.db.data &&
        global.db.data.users &&
        global.db.data.users[m.sender];

      const groupMetadata = conn.chats[m.chat]
      const participants =
        (m.isGroup
          ? await (
              await conn.chats[m.chat]
            ).participants
          : []) || [];
      const user =
        (m.isGroup
          ? participants.find((u) => conn.decodeJid(u.id) === m.sender)
          : {}) || {}; // User Data
      const bot =
        (m.isGroup
          ? participants.find((u) => conn.decodeJid(u.id) == conn.user.jid)
          : {}) || {}; // Your Data
      const isRAdmin = (user && user.admin == "superadmin") || false;
      const isAdmin = isRAdmin || (user && user.admin == "admin") || false; // Is User Admin?
      const isBotAdmin = (bot && bot.admin) || false; // Are you Admin?
      for (let name in global.plugins) {
        var plugin;
        if (typeof plugins[name].code === "function") {
          var ai = plugins[name];
          plugin = ai.code;
          for (var prop in ai) {
            if (prop !== "run") {
              plugin[prop] = ai[prop];
            }
          }
        } else {
          plugin = plugins[name];
        }
        if (!plugin) continue;
        if (plugin.disabled) continue;
        if (typeof plugin.all === "function") {
          try {
            await plugin.all.call(conn, m, chatUpdate);
          } catch (e) {
             if (/(overlimit|timed|timeout|users|item|time)/ig.test(e.message)) return
            console.error(e);
          }
        }
        const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
        let _prefix = plugin.customPrefix
          ? plugin.customPrefix
          : conn.prefix
            ? conn.prefix
            : global.prefix;
        let match = (
          _prefix instanceof RegExp // RegExp Mode?
            ? [[_prefix.exec(m.text), _prefix]]
            : Array.isArray(_prefix) // Array?
              ? _prefix.map((p) => {
                  let re =
                    p instanceof RegExp // RegExp in Array?
                      ? p
                      : new RegExp(str2Regex(p));
                  return [re.exec(m.text), re];
                })
              : typeof _prefix === "string" // String?
                ? [
                    [
                      new RegExp(str2Regex(_prefix)).exec(m.text),
                      new RegExp(str2Regex(_prefix)),
                    ],
                  ]
                : [[[], new RegExp()]]
        ).find((p) => p[1]);
        if (typeof plugin.before === "function")
          if (
            await plugin.before.call(conn, m, {
              match,
              conn: conn,
              participants,
              groupMetadata,
              user,
              bot,
              isROwner,
              isOwner,
              isRAdmin,
              isAdmin,
              isBotAdmin,
              isPrems,
              isBans,
              chatUpdate,
            })
          )
            continue;
        if (typeof plugin !== "function") continue;
        const q = m.quoted ? m.quoted : m;
        if (opts && match && m) {
          let result =
            ((opts?.["multiprefix"] ?? true) && (match[0] || "")[0]) ||
            ((opts?.["noprefix"] ?? false) ? null : (match[0] || "")[0]);
          usedPrefix = result;
          let noPrefix;
          if (isOwner) {
            noPrefix = !result ? m.text : m.text.replace(result, "");
          } else {
            noPrefix = !result ? "" : m.text.replace(result, "").trim();
          }
          let [command, ...args] = noPrefix.trim().split` `.filter((v) => v);
          args = args || [];
          let _args = noPrefix.trim().split(" ").slice(1);
          let text = ''
            if (m.quoted && !_args) {
            text = command ? m.quoted.text.slice(command.length + 1) : m.quoted.text
          } else {
            text = _args.join(" ")
          }
          command = (command || "").toLowerCase();
          let fail = plugin.fail || global.dfail;

          const prefixCommand = !result
            ? plugin.customPrefix || plugin.command
            : plugin.command;
          let isAccept =
            (prefixCommand instanceof RegExp && prefixCommand.test(command)) ||
            (Array.isArray(prefixCommand) &&
              prefixCommand.some((cmd) =>
                cmd instanceof RegExp ? cmd.test(command) : cmd === command,
              )) ||
            (typeof prefixCommand === "string" && prefixCommand === command);
          m.prefix = !!result;
          usedPrefix = !result ? "" : result;
          if (!isAccept) continue;
          m.plugin = name;
          m.chatUpdate = chatUpdate;
          if (
            m.chat in global.db.data.chats ||
            m.sender in global.db.data.users
          ) {
            let chat = global.db.data.chats[m.chat];
            let user = global.db.data.users[m.sender];
            if (
              name != "owner-unbanchat.js" &&
              chat &&
              chat.isBanned &&
              !isOwner
            )
              return;
            if (
              name != "group-unmute.js" &&
              chat &&
              chat.mute &&
              !isAdmin &&
              !isOwner
            )
              return;
          }

          if (db.data.settings.blockcmd.includes(command)) {
            dfail("block", m, conn);
            continue;
          }
          if (plugin.owner && !isOwner) {
            fail("owner", m, conn);
            continue;
          }
          if (plugin.mods && !isMods) {
            fail("mods", m, conn);
            continue;
          }
          if (plugin.premium && !isPrems) {
            fail("premium", m, conn);
            continue;
          }
          if (plugin.group && !m.isGroup) {
            fail("group", m, conn);
            continue;
          } else if (plugin.botAdmin && !isBotAdmin) {
            fail("botAdmin", m, conn);
            continue;
          } else if (plugin.admin && !isAdmin) {
            fail("admin", m, conn);
            continue;
          }
          if (plugin.private && m.isGroup) {
            fail("private", m, conn);
            continue;
          }
          if (plugin.register && db.data.users[m.sender].registered === false) {
            fail("unreg", m, conn);
            continue;
          }
          let cmd;
          m.command = command;
          m.isCommand = true;
          if (m.isCommand) {
            let now = Date.now();
            if (m.command in global.db.data.respon) {
              cmd = global.db.data.respon[m.command];
              if (!isNumber(cmd.total)) cmd.total = 1;
              if (!isNumber(cmd.success)) cmd.success = m.error != null ? 0 : 1;
              if (!isNumber(cmd.last)) cmd.last = now;
              if (!isNumber(cmd.lastSuccess))
                cmd.lastSuccess = m.error != null ? 0 : now;
            } else
              cmd = db.data.respon[m.command] = {
                total: 1,
                success: m.error != null ? 0 : 1,
                last: now,
                lastSuccess: m.error != null ? 0 : now,
              };
            cmd.total += 1;
            cmd.last = now;
            if (m.error == null) {
              cmd.success += 1;
              cmd.lastSuccess = now;
            }
          }
          let xp = "exp" in plugin ? parseInt(plugin.exp) : 17;
          if (xp > 9999999999999999999999) m.reply("Ngecit -_-");
          else m.exp += xp;
          if (!_user.limit > 100 && _user.limit < 1) {
            let limit = `*[ YOUR LIMIT HAS EXPIRED ]*\n> • _Limit anda telah habis silahkan tunggu 24 jam untuk mereset limit anda, upgrade ke premium untuk mendapatkan unlimited limit_`;
            conn.sendMessage(
              m.chat,
              {
                text: limit,
              },
              { quoted: m },
            );
            continue;
          }
          if (plugin.level > _user.level) {
            let level = `*[ THE LEVEL IS NOT ENOUGH ]*\n> • _Kamu Perlu level *[ ${plugin.level} ]*, untuk mengakses ini, silahkan main minigame atau RPG untuk meningkatkan level anda_`;
            conn.sendMessage(
              m.chat,
              {
                text: level,
              },
              { quoted: m },
            );
            continue;
          }
          let extra = {
            match,
            usedPrefix,
            noPrefix,
            _args,
            args,
            command,
            text,
            conn: conn,
            participants,
            groupMetadata,
            user,
            bot,
            isROwner,
            isOwner,
            isRAdmin,
            isAdmin,
            isBotAdmin,
            isPrems,
            isBans,
            chatUpdate,
          };
          try {
            await plugin.call(conn, m, extra);
            if (!isPrems) m.limit = m.limit || plugin.limit || true;
          } catch (e) {
              if (/(overlimit|timed|timeout|users|item|time)/ig.test(e.message)) return
            if (e) {
              let text = util.format(e);
              conn.logger.error(text);
              if (text.match("rate-overlimit")) return;
              if (e.name) {
                for (let jid of global.owner) {
                  let data = (await conn.onWhatsApp(jid))[0] || {};
                  if (data.exists)
                    conn.reply(
                      data.jid,
                      `*[ REPORT ERROR ]*
*• Name Plugins :* ${m.plugin}
*• From :* @${m.sender.split("@")[0]} *(wa.me/${m.sender.split("@")[0]})*
*• Jid Chat :* ${m.chat} 
*• Command  :* ${usedPrefix + command}

*• Error Log :*
\`\`\`${text}\`\`\`
`.trim(),
                      fkontak,
                    );
                }
                m.reply("*[ system notice ]* Terjadi kesalahan pada bot !");
              }
              m.reply(e);
            }
          } finally {
            if (typeof plugin.after === "function") {
              try {
                await plugin.after.call(conn, m, extra);
              } catch (e) {
                  if (/(overlimit|timed|timeout|users|item|time)/ig.test(e.message)) return
               if (e.message.match("rate-overlimit")) return;
              }
            }
          }
          break;
        }
      }
    } catch (e) {
   if (/(overlimit|timed|timeout|users|item|time)/ig.test(e.message)) return
      console.error(e);
    } finally {
      if (opts["queque"] && m.text) {
        const quequeIndex = conn.msgqueque.indexOf(m.id || m.key.id);
        if (quequeIndex !== -1) conn.msgqueque.splice(quequeIndex, 1);
      }
      let user,
        stats = global.db.data.stats;
       let m = msg
      if (m) {
        if (m.sender && (user = global.db.data.users[m.sender])) {
          user.exp += m.exp;
          user.limit -= m.limit * 1;
        }
        let stat;
        if (m.plugin) {
          let now = +new Date();
          if (m.plugin in stats) {
            stat = stats[m.plugin];
            if (!isNumber(stat.total)) stat.total = 1;
            if (!isNumber(stat.success)) stat.success = m.error != null ? 0 : 1;
            if (!isNumber(stat.last)) stat.last = now;
            if (!isNumber(stat.lastSuccess))
              stat.lastSuccess = m.error != null ? 0 : now;
          } else
            stat = stats[m.plugin] = {
              total: 1,
              success: m.error != null ? 0 : 1,
              last: now,
              lastSuccess: m.error != null ? 0 : now,
            };
          stat.total += 1;
          stat.last = now;
          if (m.error == null) {
            stat.success += 1;
            stat.lastSuccess = now;
          }
        }
      }
      try {
     require("./lib/system.js")(m, conn);
       require("./lib/logger.js")(m, conn);
      } catch (e) {
        console.log(m, m.quoted, e);
      }
      if (db.data.settings.online) {
    await conn.readMessages([m.key])
   if (m.isCommand) return conn.sendPresenceUpdate("composing", m.chat)
      }
    }
}
 
 
global.dfail = (type, m, conn) => {
    let msg = {
      owner:  `┌─⭓「 *SYAII ONLY* 」
│ *• Msg :* this feature only for Bang syaii 😹!
└───────────────⭓`,
      mods:  `┌─⭓「 *MODERATOR ONLY* 」
│ *• Msg :* this feature only for moderator bot!
└───────────────⭓`,
      group:  `┌─⭓「 *GROUP ONLY* 」
│ *• Msg :* sorry this features only used in Group chat
└───────────────⭓`,
      private:  `┌─⭓「 *PRIVATE ONLY* 」
│ *• Msg :* sorry this features only used in Private chat
└───────────────⭓`,
      admin: `┌─⭓「 *ADMIN ONLY* 」
│ *• Msg :* this feature only for admin group!
└───────────────⭓`,
      botAdmin: `┌─⭓「 *BOT NOT ADMIN* 」
│ *• Msg :* Promote bot to admin before use this command!
└───────────────⭓`,
      block: `┌─⭓「 *BLOCK COMAMAND* 」
│ *• Msg :* sorry command has been blocked !
└───────────────⭓`,
      unreg: `┌─⭓「 *REGISTER BEFORE USING BOT* 」
│ • .daftar your_name.29
│ • .regmail youremail@gmail.com
└───────────────⭓
if you first register on this bot you 
will get additional rewards !

* *Limit :* +10
* *Money :* +10000`,
      premium:  `┌─⭓「 *PREMIUM ONLY* 」
│ *• Msg :* this feature only for premium bot!
└───────────────⭓

Type *.buyprem* for buying premium bot`,
    }[type];
    if (msg)
      return conn.sendMessage(
        m.chat,
        {
          text: msg,
          contextInfo: {
            externalAdReply: {
              title: "Access Denied !",
              body: wm,
              thumbnailUrl: "https://pomf2.lain.la/f/edf3pm4h.jpg",
              sourceUrl: null,
              mediaType: 1,
              renderLargerThumbnail: true,
            },
          },
        },
        { quoted: m },
      );
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright("Update 'handler.js'"));
  delete require.cache[file];
  if (global.reloadHandler) console.log(global.reloadHandler());
});
