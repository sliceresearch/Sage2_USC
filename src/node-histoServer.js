// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/**
 * @module histoServer
 */

function histoServer(wsio) {
    wsio.on('loadHistoData',    wsLoadHistoData);
};

histoServer.prototype.wsLoadHistoData = function(wsio, data) {

}

module.exports = histoServer;
