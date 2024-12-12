import {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  EVENTS,
} from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { MetaProvider as Provider } from "@builderbot/provider-meta";
import path from "path";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import {
  generateOrderTextPickup,
  generateOrderTextExpress,
} from "../utils/utils.js";
import nodemailer from "nodemailer";
import { sentMessageWhatsapp } from "../utils/sendWhatsapp.js";
import "dotenv/config";
var transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "joseluissequeirag@gmail.com",
    pass: "lnkp ghof nucj gqos",
  },
});
const sendEmailWithOrder = (orderInfo, client) => {
  //sentMessageWhatsapp(orderInfo);
  var mailOptions = {
    from: "joseluissequeirag@gmail.com",
    to: "jose@orbitacr.net",
    subject: `ROSTI PEDIDO - ${client}`,
    text: orderInfo,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

//documento
// Initialize GoogleGenerativeAI with your API_KEY.
const genAI = new GoogleGenerativeAI("AIzaSyAAkZtUUpr1CANbqkZJVkqhx-vNbi4aMS8");
// Initialize GoogleAIFileManager with your API_KEY.
const fileManager = new GoogleAIFileManager(
  "AIzaSyAAkZtUUpr1CANbqkZJVkqhx-vNbi4aMS8"
);

const model = genAI.getGenerativeModel({
  // Choose a Gemini model.
  model: "gemini-1.5-flash-8b",
});
const confirmOrderModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-8b",
  systemInstruction:
    "solo contestar el valor de true o false si el siguiente texto tiene un monto en CRC",
});
// Upload the file and specify a display name.
const uploadResponseMenu = await fileManager.uploadFile("assets/Menu.pdf", {
  mimeType: "application/pdf",
  displayName: "Gemini 1.5 PDF",
});

const uploadResponseInfo = await fileManager.uploadFile(
  "assets/Info_sucursales.pdf",
  {
    mimeType: "application/pdf",
    displayName: "Gemini 1.5 PDF",
  }
);

async function confirmOrder(order) {
  const chatSession = confirmOrderModel.startChat({});
  const result = await chatSession.sendMessage(order);
  return result.response.text();
}

async function generateOrder(order) {
  const result = await model.generateContent([
    {
      fileData: {
        mimeType: uploadResponseMenu.file.mimeType,
        fileUri: uploadResponseMenu.file.uri,
      },
    },
    {
      text: `generar un un pedido  con el menu proporcionado la moneda es ₡, incluir el total y el nombre del platillo mas el precio, con los siguientes platillos: ${order}, excluir de la orden de compra platillos que no se encuentran en el menú (siempre responder en español y en dado caso que no se pueda generar la orden de compras responder solamente la frase: "no se puedo generar la orden." y dar un brev explicación porque no se puede generar la orden e compras), si algun platillo no está en el menú la orden no se debe generar`,
    },
  ]);
  return result.response.text();
}

async function generateInfo(answer) {
  const result = await model.generateContent([
    {
      fileData: {
        mimeType: uploadResponseInfo.file.mimeType,
        fileUri: uploadResponseInfo.file.uri,
      },
    },
    {
      text: `Según la información del restaurante contesteme  la siguiente información en español :  ${answer}`,
    },
  ]);

  return result.response.text();
}

//principal
const mainPath = path.join("messages", "main.txt");
const mainText = fs.readFileSync(mainPath, "utf8");

//Order
const createOrderPath = path.join("messages", "createOrder.txt");
const createOrderAgain = path.join("messages", "createOrderAgain.txt");
const createOrderText = fs.readFileSync(createOrderPath, "utf8");
const createOrderAgainText = fs.readFileSync(createOrderAgain, "utf8");
//consulta
const consultaPath = path.join("messages", "consulta.txt");
const consultaText = fs.readFileSync(consultaPath, "utf8");

const PORT = process.env.PORT ?? 3008;
const welcomeFlow = addKeyword(EVENTS.WELCOME)
  .addAnswer(
    "¡Hola! 🐔🍗 Bienvenido/a Rosti, donde el sabor se encuentra con la tradición.",
    {
      delay: 500,
      media: "assets/rosti.png",
    }
  )
  .addAnswer(
    "",
    {
      delay: 1000,
      media: "assets/rosti.png",
    },
    async (ctx, { flowDynamic, globalState }) => {
      globalState.update({ customerPhone: ctx.from });
      await flowDynamic(`En que te podemos ayudar ${ctx.name}?`);
    }
  )
  .addAnswer(
    mainText,
    { capture: true, delay: 1100 },
    async (ctx, { fallBack, gotoFlow }) => {
      if (!["1", "2"].includes(ctx.body)) {
        return fallBack(mainText);
      }
      switch (ctx.body) {
        case "1":
          return gotoFlow(enviaMenuFlow);
        case "2":
          return gotoFlow(consultarFlow);
      }
    }
  );
const consultarFlow = addKeyword(EVENTS.ACTION)
  .addAnswer(
    consultaText,
    { capture: true },
    async (ctx, { gotoFlow, flowDynamic, fallBack }) => {
      if (!isNaN(ctx.body)) {
        if (ctx.body !== "1") {
          return fallBack(consultaText);
        }
      }
      switch (ctx.body) {
        case "1":
          return gotoFlow(welcomeFlow);
        default:
          var consulta = await generateInfo(ctx.body); //pregunta a Gemini
          await flowDynamic(consulta);
      }
    }
  )
  .addAnswer(
    [
      "Desea realizar otra pregunta?",
      "👉 Digite 1 para *Consultar de nuevo*",
      "👉 Digite 2 para *ir al menu principal*",
    ].join("\n"),
    { capture: true },
    async (ctx, { gotoFlow, fallBack }) => {
      if (!["1", "2"].includes(ctx.body)) {
        return fallBack(
          [
            "Elija alguna de estas opciones:",
            "👉 Digite 1 para *Consultar de nuevo*",
            "👉 Digite 2 para *ir al menu principal*",
          ].join("\n")
        );
      }
      switch (ctx.body) {
        case "1":
          return gotoFlow(consultarFlow);
        case "2":
          return gotoFlow(welcomeFlow);
      }
    }
  );

const thanks = addKeyword(EVENTS.ACTION).addAnswer(
  [
    "¡Gracias por tu preferencia",
    "🐔🍗 En Rosti, cada pedido es una oportunidad para compartir contigo el auténtico sabor de la tradición.",
  ].join("\n"),
  {
    delay: 500,
    media: "assets/rosti.png",
  },
  async (ctx, { flowDynamic, globalState }) => {
    sendEmailWithOrder(
      globalState.get("orderInfoGen"),
      globalState.get("customerName")
    );
    await flowDynamic();
  }
);

const expressServiceFlow = addKeyword(EVENTS.ACTION)
  .addAnswer(
    "📍Escriba dirección de domicilio para la entrega de su pedido👇",
    { capture: true },
    async (ctx, { globalState }) => {
      await globalState.update({ customerDirection: ctx.body });
    }
  )
  .addAnswer(
    "Revise la siguiente información:",
    async (ctx, { flowDynamic, globalState }) => {
      let orderInfoGen = generateOrderTextExpress(
        globalState.get("orderInfo"),
        globalState.get("customerName"),
        globalState.get("customerDirection"),
        ctx.from
      );
      globalState.update({ orderInfoGen: orderInfoGen });
      await flowDynamic(orderInfoGen);
    }
  )
  .addAnswer(
    [
      "Si la información de tu pedido es correcto puedes *confirmar tu pedido*",
      "👉 Digite 1 para *confirmar tu pedido* ✅",
      "👉 Digite 2 para *realizar nuevo pedido* 🍗",
      "👉 Digite 3 para *cancelar pedido* ❌",
    ].join("\n"),
    { capture: true },
    async (ctx, { fallBack, gotoFlow }) => {
      if (!["1", "2", "3"].includes(ctx.body)) {
        return fallBack(
          [
            "Si la información de tu pedido es correcto puedes *confirmar tu pedido*",
            "👉 Digite 1 para *confirmar tu pedido* ✅",
            "👉 Digite 2 para *para realizar nuevo pedido* 🍗",
            "👉 Digite 3 para *cancelar pedido* ❌",
          ].join("\n")
        );
      }
      switch (ctx.body) {
        case "1":
          return gotoFlow(thanks);

        case "2":
          return gotoFlow(enviaMenuFlow);
        case "3":
          return gotoFlow(welcomeFlow);
      }
    }
  );

const pickUpFlow = addKeyword(EVENTS.ACTION)
  .addAnswer("Puede *Descargar* y *revisar* las sucursales 🏪🍗", {
    delay: 800,
    media: "assets/Info_sucursales.pdf",
  })
  .addAnswer(
    "Escriba la sucursal para retirar su pedido, ejemplo: *Rosti Alajuela*",
    { capture: true },
    async (ctx, { globalState }) => {
      await globalState.update({ rostibranch: ctx.body });
    }
  )
  .addAnswer(
    "Revise la siguiente información:",
    async (ctx, { flowDynamic, globalState }) => {
      let orderInfoGen = generateOrderTextPickup(
        globalState.get("orderInfo"),
        globalState.get("customerName"),
        globalState.get("rostibranch"),
        ctx.from
      );
      globalState.update({ orderInfoGen: orderInfoGen });
      await flowDynamic(orderInfoGen);
    }
  )
  .addAnswer(
    [
      "Si la información de tu pedido es correcto puedes *confirmar tu pedido*",
      "👉 Digite 1 para *confirmar tu pedido* ✅",
      "👉 Digite 2 para *realizar nuevo pedido* 🍗",
      "👉 Digite 3 para *cancelar pedido* ❌",
    ].join("\n"),
    { capture: true },
    async (ctx, { fallBack, gotoFlow }) => {
      if (!["1", "2", "3"].includes(ctx.body)) {
        return fallBack(
          [
            "Si la información de tu pedido es correcto puedes *confirmar tu pedido*",
            "👉 Digite 1 para *confirmar pedido* ✅",
            "👉 Digite 2 para *para realizar nuevo pedido* 🍗",
            "👉 Digite 3 para *cancelar pedido* ❌",
          ].join("\n")
        );
      }
      switch (ctx.body) {
        case "1":
          return gotoFlow(thanks);
        case "2":
          return gotoFlow(enviaMenuFlow);
        case "3":
          return gotoFlow(welcomeFlow);
      }
    }
  );

const confirmarOrdenFlow = addKeyword(EVENTS.ACTION)
  .addAnswer(
    "Escriba su nombre:👇",
    { capture: true },
    async (ctx, { globalState }) => {
      await globalState.update({ customerName: ctx.body });
    }
  )
  .addAnswer(
    [
      "Elija alguna de estas opciones:",
      "👉 Digite *1* *Retirar pedido en sucursal* 🏪",
      "👉 Digite *2*  *Servicio express* 🛵",
      "👉 Digite *3* para *Realizar nueva pedido* 🍗",
      "👉 Digite *4* para *Cancelar orden* ❌",
    ].join("\n"),
    { capture: true },
    async (ctx, { gotoFlow, fallBack }) => {
      if (!["1", "2", "3", "4"].includes(ctx.body)) {
        return fallBack(
          [
            "Elija alguna de estas opciones:",
            "👉 Digite *1* *Retirar pedido en sucursal* 🏪",
            "👉 Digite *2*  *Servicio express* 🛵",
            "👉 Digite *3* para *Realizar nueva pedido* 🍗",
            "👉 Digite *4* para *Cancelar orden* ❌",
          ].join("\n")
        );
      }
      switch (ctx.body) {
        case "1":
          return gotoFlow(pickUpFlow);
        case "2":
          return gotoFlow(expressServiceFlow);
        case "3":
          return gotoFlow(enviaMenuFlow);
        case "4":
          return gotoFlow(welcomeFlow);
      }
    }
  );
const cancelarOrdenFlow = addKeyword("Cancelar").addAnswer("Cancelar pedido");
const nuevaOrdenFlow = addKeyword("Nueva orden").addAnswer("Nueva pedido");

//parse to bool
function parseBool(value) {
  if (typeof value === "string") {
    value = value.replace(/^\s+|\s+$/g, "").toLowerCase();
    if (value === "true" || value === "false") return value === "true";
  }
  return; // returns undefined
}
const enviaMenuFlow = addKeyword(EVENTS.ACTION)
  .addAnswer("Puede *Descargar* y *revisar* el menú 🥗🍕🍔🍰", {
    delay: 800,
    media: "assets/Menu.pdf",
  })
  .addAnswer(
    createOrderText,
    { capture: true },
    async (ctx, { gotoFlow, flowDynamic, globalState, fallBack }) => {
      if (!isNaN(ctx.body)) {
        if (ctx.body !== "2") {
          console.log("no puede salir");
          return fallBack(createOrderText);
        }
      }
      switch (ctx.body) {
        case "2":
          return gotoFlow(welcomeFlow);
        default:
          // await globalState.update({ mensaje: ctx.body });
          var order = await generateOrder(ctx.body);
          var orderConfirmed = await confirmOrder(order);
          console.log("1:" + orderConfirmed.toLowerCase());
          console.log(parseBool(orderConfirmed.toLowerCase()));
          if (!parseBool(orderConfirmed.toLowerCase())) {
            return fallBack(order + createOrderAgainText);
          } else {
            globalState.update({ orderInfo: order });
            await flowDynamic(order);
          }
      }
    }
  )
  .addAnswer(
    [
      "*(Revisar su pedido)*, elija alguna de estas opciones:",
      "👉 Digite 1 para *Continuar* ✅",
      "👉 Digite 2 para *Realizar nueva pedido* 🍗",
      "👉 Digite 3 para *Cancelar pedido* ❌",
    ].join("\n"),
    { capture: true },
    async (ctx, { gotoFlow, fallBack }) => {
      if (!["1", "2", "3"].includes(ctx.body)) {
        return fallBack(
          [
            "*(Revisar su pedido)*, elija alguna de estas opciones:",
            "👉 Digite 1 para *Continuar* ✅",
            "👉 Digite 2 para *Realizar nueva pedido* 🍗",
            "👉 Digite 3 para *Cancelar pedido* ❌",
          ].join("\n")
        );
      }
      switch (ctx.body) {
        case "1":
          return gotoFlow(confirmarOrdenFlow);
        case "2":
          return gotoFlow(enviaMenuFlow);
        case "3":
          return gotoFlow(welcomeFlow);
      }
    }
  );

const main = async () => {
  const adapterFlow = createFlow([
    welcomeFlow,
    consultarFlow,
    enviaMenuFlow,
    confirmarOrdenFlow,
    cancelarOrdenFlow,
    nuevaOrdenFlow,
    pickUpFlow,
    expressServiceFlow,
    thanks,
  ]);
  const adapterProvider = createProvider(Provider, {
    jwtToken: process.env.META_TOKEN,
    numberId: "503794446148621",
    verifyToken: "hola",
    version: "v21.0",
  });
  const adapterDB = new Database();

  const { handleCtx, httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  adapterProvider.server.post(
    "/v1/messages",
    handleCtx(async (bot, req, res) => {
      const { number, message, urlMedia } = req.body;
      await bot.sendMessage(number, message, { media: urlMedia ?? null });
      return res.end("sended");
    })
  );

  adapterProvider.server.post(
    "/v1/register",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("REGISTER_FLOW", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
    "/v1/samples",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("SAMPLES", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
    "/v1/blacklist",
    handleCtx(async (bot, req, res) => {
      const { number, intent } = req.body;
      if (intent === "remove") bot.blacklist.remove(number);
      if (intent === "add") bot.blacklist.add(number);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", number, intent }));
    })
  );

  httpServer(+PORT);
};

main();
