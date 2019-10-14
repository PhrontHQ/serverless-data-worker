// this function gets triggered on new connections
// if not provided, connections are successful by default
on('connect', async (data, socket) => {
    // the following data are available in the socket object
    // id represnets the connection id of a certain client
    const { id, domain, stage } = socket
  
    socket.send(data)

    // you can return status codes directly
    return 200
})

// this function gets triggered whenever a client disconnects
// if not provided, disconnection is not handled
on('disconnect', async (data, socket) => {
  // e.g. business logic that removes connection ids from a db table
})

// this function gets triggered whenever a client sends data to the specified route
// in this example, you're handling the "message" route
// so clients need to send the following JSON data: { "route": "message", "data": { "foo": "bar" } }
on('message', async (data, socket) => {
  // you can send data to the connected client with the send() function
  await socket.send(data)
})

// this function gets triggered to handle any other data that is not handled above
on('default', async (data, socket) => {
  // you can also send data to a specific connection id (that you might have saved in a table)
  // this is very useful for a broadcasting functionality
  await socket.send(data)
})