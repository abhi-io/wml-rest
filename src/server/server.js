var Hapi = require('hapi');
var Inert = require('inert');
var Vision = require('vision');
var HapiSwagger = require('hapi-swagger');
var Joi = require('joi');
var Search = require('../api/search');
var AllProducts = require('../helper/allProducts');
var Product = require('../helper/product');
var ProductsCache = require('../helper/productCache');
var config = require('../helper/config');

var Server = (function() {
    var hapiServer = new Hapi.Server();

    var swaggerOptions = {
        info: {
            title: 'Test API Documentation',
            version: '1.0.0',
        },
    };

    var registration = [
        Inert,
        Vision,
        {
            'register': HapiSwagger,
            'options': swaggerOptions
        }
    ];

    var apiConfig = { tags: ['api'] };

    function Server(host, port) {
        this.host = host;
        this.port = port;
    }
    Server.prototype.init = function() {
        console.log("Initializing server...");
        hapiServer.connection({ host: this.host, port: this.port });
        hapiServer.register(registration);
        hapiServer.route({
            method: 'GET',
            path: '/search/{text}',
            config: {
                description: 'Search Text',
                notes: 'Returns an array of product codes for a given search text',
                tags: ['api'], // ADD THIS TAG
                validate: {
                    params: {
                        text: Joi.string().required().description('item description/text to search for')
                    }
                }
            },
            handler: function(request, reply) {
                var search = new Search(request.params.text);
                search.start(function(error, response) {
                    if (error) {
                        throw new Error("An error occurred: " + JSON.stringify(error));
                    }
                    return reply(response);
                });
            }
        });

        hapiServer.route({
            method: 'GET',
            path: '/stop',
            config: {
                description: 'Stop Server',
                notes: 'Shuts the server down. Just for experimentation. No one would ever do something like this in production.'
            },
            handler: function(request, reply) {
                hapiServer.stop();
                return reply("Server will stop in 5 seconds.");
            }
        });

        hapiServer.route({
            method: 'GET',
            path: '/allProducts',
            config: {
                description: 'Get All Products',
                notes: 'Get all the product codes that are stored on GutHub url.',
                tags: ['api']
            },
            handler: function(request, reply) {
                return reply(AllProducts);
            }
        });

        hapiServer.route({
            method: 'GET',
            path: '/cache/use/{enabled}',
            config: {
                description: 'Configure application to use or not to use the cached data.',
                notes: 'Configure application to use or not to use the cached data.',
                validate: {
                    params: {
                        enabled: Joi.boolean().required().description('enabled can only be true or false')
                    }
                }
            },
            handler: function(request, reply) {
                if (request.params.enabled === true) {
                    config.useCache = true;
                    return reply("Caching enabled...");
                } else {
                    config.useCache = false;
                    return reply("Caching disabled...");
                }
            }
        });

        hapiServer.route({
            method: 'GET',
            path: '/cache/all',
            config: {
                description: 'Get All Cached Products',
                notes: 'Get All Cached Products'
            },
            handler: function(request, reply) {
                return reply(ProductsCache);
            }
        });

        hapiServer.route({
            method: 'GET',
            path: '/cache/clear',
            config: {
                description: 'Clear All Cached Products',
                notes: 'Clear All Cached Products'
            },
            handler: function(request, reply) {
                ProductsCache = {};
                return reply(ProductsCache);
            }
        });

        hapiServer.route({
            method: 'GET',
            path: '/product/{item}',
            config: {
                description: 'Get Product Details',
                notes: 'If a matching code is found, an object with all the details is returned.',
                tags: ['api'],
                validate: {
                    params: {
                        item: Joi.number().integer().required().description('product to lookup')
                    }
                }
            },
            handler: function(request, reply) {
                var product = new Product();
                product.getProductDetail(request.params.item, function(err, productDetail) {
                    return reply(productDetail).type('application/json');
                });
            }
        });
    };
    Server.prototype.start = function(callback) {
        if (callback == null) { callback = function(err) {}; }
        hapiServer.start(function(err) {
            if (err) {
                return callback(err);
            }
            console.log('Server running at:', hapiServer.info.uri);
            return callback(null);
        });
    };
    Server.prototype.stop = function(callback) {
        return hapiServer.stop(callback);
    };
    return Server;
}());
module.exports = Server;