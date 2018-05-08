'use strict';

const path = require('path');
const fse = require('fs-extra');
const xml2js = require('xml2js');
const _ = require('lodash');

const springboot = 'org.springframework.boot';
const starterWeb = 'spring-boot-starter-web';
const tomcat = 'spring-boot-starter-tomcat';
const jetty = 'spring-boot-starter-jetty';

async function useJetty(pom) {
    if (await fse.exists(pom)) {
        const xml = await fse.readFile(pom, 'utf8');
        const jsonObj = await parseXml(xml);
        try {
            const dependency = jsonObj.project.dependencies[0].dependency.find(findStarterWeb);
            if (!dependency.exclusions) {
                dependency.exclusions = [];
            }
            if (!dependency.exclusions[0]) {
                dependency.exclusions[0] = { exclusion: [] };
            }
            if (!dependency.exclusions[0].exclusion.find(findTomcatItem)) {
                dependency.exclusions[0].exclusion.push({ groupId: [springboot], artifactId: [tomcat] });
            }

            if (!jsonObj.project.dependencies[0].dependency.find(findJettyItem)) {
                jsonObj.project.dependencies[0].dependency.push({ groupId: [springboot], artifactId: [jetty] });
            }

            const builder = new xml2js.Builder();
            const newXml = builder.buildObject(jsonObj);
            return fse.writeFile(pom, newXml);
        } catch (err) {
            return err;
        }
    }
}

async function useTomcat(pom) {
    if (await fse.exists(pom)) {
        const xml = await fse.readFile(pom, 'utf8');
        const jsonObj = await parseXml(xml);
        try {
            // tslint:disable-next-line:underscore-consistent-invocation
            const jettyIndex = _.findIndex(jsonObj.project.dependencies[0].dependency, findJettyItem);
            if (jettyIndex > -1) {
                jsonObj.project.dependencies[0].dependency.splice(jettyIndex, 1);
            }

            const dependency = jsonObj.project.dependencies[0].dependency.find(findStarterWeb);
            if (dependency && dependency.exclusions && dependency.exclusions[0] && dependency.exclusions[0].exclusion) {
                // tslint:disable-next-line:underscore-consistent-invocation
                const tomcatIndex = _.findIndex(dependency.exclusions[0].exclusion, findTomcatItem);
                if (tomcatIndex > -1) {
                    dependency.exclusions[0].exclusion.splice(tomcatIndex, 1);
                }
            }
            const builder = new xml2js.Builder();
            const newXml = builder.buildObject(jsonObj);
            return fse.writeFile(pom, newXml);
        } catch (err) {
            console.log(err);
            return err;
        }
    }
}

const findStarterWeb = (item) => { return item.groupId[0] === springboot && item.artifactId[0] === starterWeb; };

const findTomcatItem = (item) => { return item.groupId[0] === springboot && item.artifactId[0] === tomcat; };

const filterTomcatItem = (item) => { return item.groupId[0] !== springboot && item.artifactId[0] !== tomcat; };

const findJettyItem = (item) => { return item.groupId[0] === springboot && item.artifactId[0] === jetty; };

const filterJettyItem = (item) => { return item.groupId[0] !== springboot && item.artifactId[0] !== jetty; };

async function parseXml(xml) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xml, { explicitArray: true }, (err, res) => {
            if (err) {
                return reject(err);
            }
            return resolve(res);
        });
    });
}

module.exports = {
    useJetty: useJetty,
    useTomcat: useTomcat
}