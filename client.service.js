function fillClientData(client) {
  if (!client) return showErrorMessage("No se pudo cargar cliente");
  const headers = ACTIVE_SPREADSHEET.getRange("B23:B33")
    .getValues()
    .flatMap((v) => v);
  let clientValues = jsonToSheetValues({
    data: client,
    headers,
    direction: "vertical",
  });
  console.log("clientValues", clientValues);
  ACTIVE_SPREADSHEET.getRange("C23:C33").setValues(clientValues);
}

function getClientRange() {
  const headers = ACTIVE_SPREADSHEET.getRange("B22:B35")
    .getValues()
    .flatMap((v) => v);
  const range = ACTIVE_SPREADSHEET.getRange("C22:C35");
  return { headers, range };
}

function fillLatestOrdersFromClients(orders) {
  const [headers] = ACTIVE_SPREADSHEET.getRange("B7:D7").getValues();
  const values = jsonToSheetValues({ data: orders, headers });
  const tableRange = ACTIVE_SPREADSHEET.getRange("B8:D11");
  const ordersValues = tableRange
    .getValues()
    .map((row, i) => ((values[i] || []).length ? values[i] : row));
  tableRange.setValues(ordersValues);
}

function deleteClient() {
  const { headers, range } = getClientRange();
  const sheetValues = range.getValues().flatMap((v) => v);
  let [client] = sheetValuesToObject({
    headers,
    sheetValues: [sheetValues],
  });
  let clientId = client.clientId;
  delete client.clientId;
  client = { _id: clientId, ...client };
  console.log("client", client);
  const response = API.deleteClient({ _id: client._id });
  showResponseMessage(response);
  if (response.ok) {
    const emptyRange = range.getValues().map(() => [""]);
    console.log("emptyRange", emptyRange);
    range.setValues(emptyRange);
  }
}

function updateOrCreateClient() {
  const { headers, range } = getClientRange();
  const sheetValues = range.getValues().flatMap((v) => v);
  let [client] = sheetValuesToObject({
    headers,
    sheetValues: [sheetValues],
  });
  let clientId = client.clientId;
  delete client.clientId;
  client = { _id: clientId, ...client };
  console.log("client", client);
  const response = API.updateOrCreateClient(client);
  showResponseMessage(response);
  if ((response.data || {}).upsertedId) {
    ACTIVE_SPREADSHEET.getRange("C22").setValue(response.data.upsertedId);
  }
}
