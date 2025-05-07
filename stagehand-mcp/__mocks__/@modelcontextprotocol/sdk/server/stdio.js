// __mocks__/@modelcontextprotocol/sdk/server/stdio.js

const mockOn = jest.fn();
const mockSend = jest.fn();
const mockClose = jest.fn();

const StdioServerTransport = jest.fn().mockImplementation(() => {
  return {
    on: mockOn,       // For server to listen to messages from transport
    send: mockSend,     // For server to send messages via transport
    close: mockClose,   // To close the transport
    // Any other methods the Server's connect() might call on the transport instance
  };
});

// Exporting the mock functions if tests need to assert calls on them,
// though typically assertions are on the Server's interaction with the transport.
StdioServerTransport._mockOn = mockOn;
StdioServerTransport._mockSend = mockSend;
StdioServerTransport._mockClose = mockClose;

export { StdioServerTransport };