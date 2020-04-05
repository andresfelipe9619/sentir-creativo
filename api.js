const API = {
  getOrders() {},
  searchOrder() {},
  getLatestOrders() {
    return fetchWebHook({ collection: "order", action: "latest" });
  },
  createOrder(data) {
    return fetchWebHook({ collection: "order", action: "create", data });
  },
  updateOrCreateOrder(data) {
    return fetchWebHook({ collection: "order", action: "update", data });
  },
  deleteOrder() {
    return fetchWebHook({ collection: "order", action: "delete" });
  },
  createClient(data) {
    return fetchWebHook({ collection: "client", action: "create", data });
  },
  updateOrCreateClient(data) {
    return fetchWebHook({ collection: "client", action: "update", data });
  },
  deleteClient() {
    return fetchWebHook({ collection: "client", action: "delete" });
  },
};

function fetchWebHook({ data, action, collection }) {
  console.log("FETCH ARGS", { data, action, collection });
  var params = {
    method: "GET",
    followRedirects: true,
    muteHttpExceptions: true,
  };
  const query = {
    action,
    collection,
    data: JSON.stringify(data),
  };
  const url2Fetch = addQuery({ url: WEB_HOOK_URL, query });
  const response = UrlFetchApp.fetch(url2Fetch, params);
  console.log("response", JSON.stringify(response));
  if (response.getResponseCode() == 200) {
    const result = JSON.parse(response.getContentText());
    console.log("result", result);
    return result;
  }
}

function addQuery({ url, query }) {
  return (
    url +
    Object.keys(query).reduce(function (p, e, i) {
      return (
        p +
        (i == 0 ? "?" : "&") +
        (Array.isArray(query[e])
          ? query[e].reduce(function (str, f, j) {
              return (
                str +
                e +
                "=" +
                encodeURIComponent(f) +
                (j != query[e].length - 1 ? "&" : "")
              );
            }, "")
          : e + "=" + encodeURIComponent(query[e]))
      );
    }, "")
  );
}
