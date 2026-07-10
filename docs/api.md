# APIs

When working within one process, communicating between objects and libraries is natural and easy - just get an object, call method, etc

Increasingly, there are situations where you might want to talk across processes - it is quite common to build REST APIs that allow users to communicate
with web server with GET/POST/etc requests. With REST, both the client (which could be a human using `wget`/`curl`, or an application) and the server
follow a predefined protocol, and there can be a fair amount of work involved to implement the protocol, even before the functionality behind the API
is implemented.

REST APIs work over HTTP and HTTPS, but there are other protocols over which you might want to implement an API mechanism - for example, when working with
NodeJS Worker threads, the only communication offered is the very crude and basic `postMessage`, and it is not long before an actual API with methods, properties,
and events would be very useful. Similarly, when controlling pages via Chromium (eg see `zx.server.puppeteer.*`), the only way to communicate with it is
by embedding output in the browser's `console.log` and injecting code.

The ZX `zx.io.api.*` classes provide a wrapper around the implementation of APIs, which allow you to write client and server code which simply implements an
interface defined by `qx.Interface`, and takes care of the protocol implementation to connect the two.

As an added bonus, when the APIs are configured to be available via HTTP, they become standard REST protocol implementations.

# How to

In order to be able to call methods on a remote process/server, we first need to create an API class, which must extend `zx.io.api.server.AbstractServerApi`, and define our remotely-callable methods like normal in the `members` section:

```js
qx.Class.define("com.mypackage.server.FruitApi", {
  extend: zx.io.api.server.AbstractServerApi,
  construct() {
    this.__fruits = [
      {
        name: "Orange",
        id: "orange",
        price: 1.2,
        qty: 4
      }
    ];
  },
  members: {
    getAllFruit() {
      return this.__fruits;
    },
    /**
     * @param {string} id
     */
    getFruitById(id) {
      return this.__fruits.find(fruit => fruit.id == id);
    }
  }
});
```

Your API methods can only accept and/or return data which is JSON-serializable and dates. This means that data like Qooxdoo objects (i.e. classes extending from `qx.core.Object`) is not allowed. Also, because this system is designed to work across process boundaries, the object received on one end will be different to the object sent from the other end. Any changes made to an object on the server will not be reflected on the client, and vice-versa.

Then your register your API on the server using the Connection Manager. This only needs to be called once in your program;

`zx.io.api.server.ConnectionManager.getInstance().registerApi(com.mypackage.server.FruitApi)`

You can also instantiate the API separately and then pass it in. This is useful if the API's contructor takes in arguments or required prior configuration:

```js
let api = new com.mypackage.server.FruitApi();
zx.io.api.server.ConnectionManager.getInstance().registerApi(api);
```

## Transports

A transport is an object which describes how to serialize, send, and receive native JavaScript objects over a specific communication channel e.g. HTTP, Node Workers, TCP, etc. We need to have a transport on both the client and the server in order to be able to use APIs. Zen-CMS provides ready-made transports for the following communication media:

- HTTP
- NodeJS Workers
- Bluetooth
- Loopback (calling methods on the same process)

If there is no transport for your specific use case, you can create your own (more on that later).

If we are using HTTP as our transport on the server with `expressjs` as our server framework, we need to create an instance of `zx.io.api.transport.http.ExpressServerTransport` and attach it to our Express instance. This only needs to be done once in the server program:

```js
let app = express();
let port = 8080;
app.use(zx.io.api.transport.http.ExpressServerTransport.jsonMiddleware());
new zx.io.api.transport.http.ExpressServerTransport(app, "/zx-api");
```

The constructor of `ExpressServerTransport` takes two arguments: the ExpressJS instance, and the route where ZX api requests will be made. The purpose of this is so that we can call methods on the server using the ZX API system on a server which does other things as well (e.g. serve webpage files), so we make all ZX API requests start with the same out prefix to isolate them from others. The prefix is `/zx-api` in the case, meaning that all ZX api-related HTTP requests will be prefixed with `/zx-api`.

Note that we have to make our app use the ZX Express JSON middleware because we will be serializing JSON over the channel.

## The client

In order to be able to call the server's api methods on the client, you first create a client transport. In our example, we will be using the `zx.io.api.transport.http.HttpClientTransport` class:

```js
let transport = new zx.io.api.transport.http.HttpClientTransport("/zx-api/");
```

The argument of the constructor is the server address, which contains a URL which points to the server and contains the path for ZX API requests configured on the server. In our case, it is `/zx-api` on the server, so we need to make it `/zx-api` as well.

Sometimes it may be necessary to specify the host has well, if our client is a NodeJS app for examples instead of a browser. For a NodeJs app, if our server is running on port 3001 on localhost, we would have to create the client transport like this:

```js
let transport = new zx.io.api.transport.http.HttpClientTransport("http://localhost:3001/zx-api/");
```

Next we create our client api. A client API has to extend `zx.io.api.client.AbstractClientApi`. That class is abstract and you can subclass it on your own but in simple cases you can create an instance of `zx.io.api.client.BasicClientApi`. The constructor takes in the following arguments:

- The client transport
- Name of the API registed on the server (server API class name by default)
- Array of the names of the methods on the server class
- API path (more on this later)

For our example, we do it like this:

```js
let transport = new zx.io.api.transport.http.HttpClientTransport("/zx-api/");
let api = new zx.io.api.client.BasicClientApi(transport, "com.mypackage.server.FruitApi", ["getAllFruit", "getFruitById"]);
```

We can then call a method on the server api like this:

```js
let fruit = await api.getFruitById("orange");
//returns {id: "orange", title: "Oranges", qty: 4, price: 1.2}
```

## Subscriptions

Sometimes, we may want the server API to publish events (i.e. notifications) and clients to subscribe to those events. To do this you first need to define your events in your server API class. Override a protected member called `_publications`, and set it to a map containing your publication names. The keys are your publication names, and the values can be any non-undefined value but it's generally good practice to use the default value for your datatype (e.g. `""` for strings, `0` for numbers, `null` for objects, etc). It's also a good idea to add a JSDoc comment and type definition.

For example, if we want publications called `fruitAdded` and `fruitRemoved` in our class, we would do it like so:

```js
qx.Class.define("com.mypackage.server.FruitApi", {
  extend: zx.io.api.server.AbstractServerApi,
  //...
  members: {
    /**@override*/
    _publications: {
      /**
       * @type {string}
       * Fired when a fruit has been added.
       * Data is the id of the fruit.
       */
      fruitAdded: "",
      /**
       * @type {string}
       * Fired when a fruit has been removed.
       * Data is the id of the fruit.
       */
      fruitRemoved: ""
    }
  }
  //...
});
```

To publish publications, we call the method `publish` inside our API. It takes in the name of the publication (must match what's in `_publications`), and the data sent with the publication (optional).

In our example, if we were to fire a publication when a fruit is added/removed, we would do it like so:

```js
members: {
  /**
   * @param {Fruit}
   */
  addFruit(fruit) {
    this.__fruits.push(fruit);
    this.publish("fruitAdded", fruit.id);
  },
  /**
   * @param {string} id
   */
  removeFruit(id) {
    this.__fruits = this.__fruits.filter(f => f.id !== id);
    this.publish("fruitRemoved", id);
  }
}
```

Just like for method parameters and return values, the data for publications must be serializable to JSON.

To subscribe to publications on the client, we use method `subscribe` on the client API, which takes in the name of the publication and a callback which is called when the server fires the publication and the data reaches the client. The callback is passed the data for the publication.

In our example, to subscribe to `fruitAdded` and `fruitRemoved`, we would do it like so:

```js
await clientApi.subscribe("fruitAdded", fruitId => {
  console.log("Fruit was added, id: " + fruitId);
});

await clientApi.subscribe("fruitRemoved", fruitId => {
  console.log("Fruit was removed, id: " + fruitId);
});
```

Please note that if your client makes more than one subscription, you **MUST** await the first call to subscribe before making subsequent subscribe calls. Subsequent subscriptions can be done in parallel however. This is because subscriptions create sessions on the server, and then the server returns the session ID back to the client, meaning the client has to wait unit it receives the session ID before making further subscriptions so that multiple sessions are not created on the server. This is looking to be improved in the future however.

In order to unsubscribe, simply call `unsubscribe` on the client API, passing in the publication name and the callback that were passed to `subscribe`. This is similar to `addListener`/`removeListener` for the Qooxdoo events system:

```js
clientApi.unsubscribe("fruitRemoved", cb);
```

It is good practice to unsubscribe as soon as we don't need to listen for publications because it will free up resources on the server.

## API termination

If our client API is no longer needed and has done its job and still has subscriptions, it is good practice to call its `terminate` method. This will unsubscribe all its subscriptions, and rejects its pending method calls and subscription calls with a `zx.io.api.TerminationException`.

## API paths

If we want to register mutiple instances of the same API class on the server, we need to 'mount' them at specific paths.
On the server when you call `registerApi` on the connection manager, pass in the path as the second argument:

```js
let api1 = new com.mypackage.server.WorkerApi();
zx.io.api.server.ConnectionManager.getInstance().registerApi(api, "/workers/worker1");
let api2 = new com.mypackage.server.WorkerApi();
zx.io.api.server.ConnectionManager.getInstance().registerApi(api2, "/workers/worker2");
```

On the client API, pass in the path as the fourth argument into the constructor of `AbstractClientApi`:

```js
let workerApi1 = zx.io.api.client.BasicClientApi(transport, "com.mypackage.server.WorkerApi", methodNames, "/workers/worker1");
let workerApi2 = zx.io.api.client.BasicClientApi(transport, "com.mypackage.server.WorkerApi", methodNames, "/workers/worker2");
```

## REST APIs

Sometimes we may simply want to call our server API methods using any old HTTP client e.g. curl and get back the result and not bother with writing a Qooxdoo JavaScript program for the client and creating transports and APIs. This is often the case for testing purposes.

Let's take the following server API class below:

```js
qx.Class.define("com.mypackage.server.RestDemo", {
  extend: zx.io.api.server.AbstractServerApi,
  members: {
    /**
     * @param {zx.io.api.server.Request} request
     * @param {zx.io.api.server.Response} response
     */
    sayHello(request, response) {
      return "Hello";
    }
  }
});
//...
connectionManager.registerApi(com.mypackage.server.RestDemo);
```

Our HTTP request would have to start with the server transport route (`/zx-api`) by default,
then `__globalApis` + '/' + the name of the server API class, then '/' + the method name.

For example, assuming our server uses `ExpressServerTransport`, is running on `localhost:3000` and is mounted on `/zx-api`,
if we run: `curl locahost:3000/zx-api/__globalApis/com.mypackage.server.RestDemo/sayHello`,
the method `sayHello` will be called with the request and response objects. Note that they are not the Express request response but custom ZX API objects which we can inspect. Because the method returns the string "Hello", that will be the output of 'curl'.

However, this approach is very limited. We can use the `_registerGet`, `_registerPost`, `_registerPut` and `_registerDelete` methods which will give us more freedom into defining REST methods (e.g. custom method paths, parameterized paths and so much more). All four methods accept the same parameters and behave the same way, except that the HTTP REST method determines which one gets called.

For example, given the following example:

```js
qx.Class.define("com.mypackage.server.FruitApi", {
  extend: zx.io.api.server.AbstractServerApi,
  construct() {
    super();

    this.__fruits = [
      {
        name: "Orange",
        id: "orange",
        price: 1.2,
        qty: 4
      }
    ];

    /**
     * @param {zx.io.api.server.Request} request
     * @param {zx.io.api.server.Response} response
     */
    const cb = (req, res) => {
      let fruitId = req.getPathArgs().fruitId;
      let humanReadable = req.getQuery().humanReadable;

      let data = this.getFruitById(fruitId);

      if (humanReadable === "true") {
        data = this.__prettyPrint(data);
      }
      return data;
    };

    this._registerGet("/get/{fruitId}", cb);

    this._registerGet("/delete/{fruitId}", (req, res) => {
      let fruitId = req.getPathArgs().fruitId;
      this.removeFruit(fruitId);
    });
  },
  members: {
    /**
     * @param {Fruit} fruit
     */
    __prettyPrint(fruit) {
      //i.e. { name: "Orange", id: "orange", price: 1.2, qty: 4 } becomes "name: Orange, id: orange, price: 1.2, qty: 4"
      return Object.entries(fruit).map([key, value] => `${key}: ${value}`).join(", ");
    }
  }
});
```

If we call `curl locahost:3000/zx-api/__globalApis/com.mypackage.server.FruitApi/get/orange?humanReadable=true`,
we would get the result `name: Orange, id: orange, price: 1.2, qty: 4`. Note the squiggly brackets notation passed into `_registerGet`. This defines path parameters, `fruitId` in this case. We get the path arguments from the request using `request.getPathArgs()` and the query parameters using `request.getQuery()`.

## Defining your own transport

If none of the pre-define transports suit your use case then it may be necessary for you to define your own transport. You need to define two classes: one for the server transport and another for the client transport.

The server transport class must extend `zx.io.api.server.AbstractServerTransport`. It needs to listen to data on the connection medium, create the `zx.io.api.server.Request` and `zx.io.api.server.Response` objects and call `zx.io.api.server.ConnectionManager.receiveMessage(request, response)`. TODO this is incomplete.

## Loopback

The abstraction of transport protocol has another benefit - that you can configure, at runtime, where certain components are located; for example, in the
`zx.server.work.*` tools, you can choose to run code asynchronously in either the current process (great for debugging) or in a seperate process in a container
(great for process isolation and reliable scalability).

## Implementing an API

An API implementation is either a Client (`zx.io.api.client.AbstractClientApi`) or a Server (`zx.io.api.client.AbstractClientApi`), and while you can derive
from these classes and add features for ultimate flexibility of configuration, the easiest way is to define an interface and then use a tool to create the
Client and Server classes automatically.
