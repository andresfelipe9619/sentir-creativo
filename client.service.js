function fillClientData(client, clientOrders = []) {
  if (!client) return showErrorMessage("No se pudo cargar cliente");
  console.log("Filling client data", client);
  cleanClientData();
  const { headers, range } = getClientRange();
  let values = jsonToSheetValues({
    data: client,
    headers,
    direction: "vertical",
  });
  console.log("values", values);
  const clientValues = range
    .getValues()
    //Completa con filas vacias si el numero de atributos es menor al rango en la hoja
    .map((row, i) => ((values[i] || []).length ? values[i] : row));

  range.setValues(clientValues);
  if (clientOrders.length) fillLatestOrdersFromClients(clientOrders);
}

function getClientRange() {
  const headers = ACTIVE_SPREADSHEET.getRange("B22:B35")
    .getValues()
    .flatMap((v) => v);
  const range = ACTIVE_SPREADSHEET.getRange("C22:C35");
  return { headers, range };
}

function getClientOrdersRange() {
  const [headers] = ACTIVE_SPREADSHEET.getRange("B37:D37").getValues();
  const range = ACTIVE_SPREADSHEET.getRange("B38:D41");
  return { headers, range };
}

function fillLatestOrdersFromClients(orders) {
  const { headers, range } = getClientOrdersRange();
  const values = jsonToSheetValues({ data: orders, headers });
  const clientValues = range
    .getValues()
    .map((row, i) => ((values[i] || []).length ? values[i] : row));
  range.setValues(clientValues);
}

function cleanClientData() {
  const { range } = getClientRange();
  const emptyRange = range.getValues().map(() => [""]);
  console.log("emptyRange", emptyRange);
  range.setValues(emptyRange);
  const { range: ordersRange } = getClientOrdersRange();
  const ordersEmptyRange = ordersRange.getValues().map(() => ["", "", ""]);
  console.log("ordersEmptyRange", ordersEmptyRange);
  ordersRange.setValues(ordersEmptyRange);
}

function deleteClient() {
  const { headers, range } = getClientRange();
  const sheetValues = range.getValues().flatMap((v) => v);
  let [client] = sheetValuesToObject({
    headers,
    sheetValues: [sheetValues],
  });
  console.log("client", client);
  const response = API.deleteClient({ _id: client._id });
  showResponseMessage(response);
  if (response.ok) cleanClientData();
}

function updateOrCreateClient() {
  const { headers, range } = getClientRange();
  const sheetValues = range.getValues().flatMap((v) => v);
  let [client] = sheetValuesToObject({
    headers,
    sheetValues: [sheetValues],
  });
  console.log("client", client);
  const response = API.updateOrCreateClient(client);
  showResponseMessage(response);
  if ((response.data || {}).upsertedId) {
    ACTIVE_SPREADSHEET.getRange("C22").setValue(response.data.upsertedId);
  }
}
