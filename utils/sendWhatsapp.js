export const sentMessageWhatsapp = (orderInfo) => {
  var botId = "503794446148621";
  // var phoneNbr = "15551418916";
  var bearerToken =
    "EAAV2YG6ZBeWcBOZB0plmGr0dc8k8Q3KZAR4emLZAQiPU10DW8vvhK8S9CAiJwWbJook5ZATZCLKW4NUdrst3EZAYKPFehNvJaBFwGsGGQX7ID2LEjtnZB2ZBmeInAdOlmfnrfFarFrZBCbqcIp4A6pxMtHtU89cyJ8eAzkh2GvdKQN2iG5jWbEBQZAPSZAjIyhOZBBzHG6Ri7jZByaKhRTIbDEDd95f47RYvejzTogDZChOT8cZD";
  var url = "https://graph.facebook.com/v15.0/" + botId + "/messages";
  var data = {
    messaging_product: "whatsapp",
    to: "50685022903",
    type: "text",
    text: {
      body: ["**pedido por whatsapp**", orderInfo].join("\n"),
    },
  };
  var postReq = {
    method: "POST",
    headers: {
      Authorization: "Bearer " + bearerToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    json: true,
  };
  fetch(url, postReq)
    .then((data) => {
      return data.json();
    })
    .then((res) => {
      console.log(res);
    })
    .catch((error) => console.log(error));
};
