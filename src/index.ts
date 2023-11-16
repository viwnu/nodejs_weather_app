#!/usr/bin/env node

import fs from "fs/promises"
import path from 'path'
import readline from 'readline'
import axios from 'axios'

// const key = 'df524e0dac3670652894bf9cb4d7a3fa' // Hardcoded for initial config
const base = `http://api.weatherstack.com/current`
const configFilePath = path.resolve('weather_app_config.json')

export const getWeather = async (queryParams: string) => {
    const options = {
        method: 'get',
        url: base + '?' + queryParams,
    }
    const response =  await axios.request(options)
    const weatherFields = response.data
    const weather = {
        observation_time: weatherFields.current.observation_time + ' hh:mm',
        temperature: weatherFields.current.temperature + ' °C',
        pressure: weatherFields.current.pressure + ' Pa',
        wind_speed: weatherFields.current.wind_speed + ' m/s',
        wind_dir: weatherFields.current.wind_dir,
        cloudcover: weatherFields.current.cloudcover + ' %',
    }
    for (const key in weather) {
        console.log(key, ': ', weather[key as keyof typeof weather])
    }
    return weather
}

const getInput = async (question: string) => {
    const readLine = readline.createInterface({
        input: process.stdin, output: process.stdout
    })
    const answer: string = await new Promise(resolve => {
        readLine.question(question, resolve)
    })
    readLine.close()
    return answer
}

const setConfig = async (newConfigFields: object) => {
    try {
        const config = JSON.parse((await fs.readFile(configFilePath)).toString())
        await fs.writeFile(configFilePath, JSON.stringify({...config, ...newConfigFields}))
    } catch (error) {   
        if(error instanceof Error && error.message.split(': ')[0] === 'ENOENT') {
            await fs.writeFile(configFilePath, JSON.stringify({...newConfigFields}))
        }
    }
}

export const app = async () => {
    const flag = process.argv[2]
    if(flag === '-s') {
        const city = await getInput('Enter city: \n')
        await setConfig({city})
    }
    if(flag === '-t') {
        const apiKey = await getInput('Enter token: \n')
        await setConfig({apiKey})
    }
    if(flag === '-h') {
        console.log(`
        Show weather in choosen city then invoke
            -s flag - to set city where you wanna get weather
            -t flag - to set used weather API key
            -h flag - show help
        `)
        return
    }
    
    let queryParams = ''
    try {
        const config = JSON.parse((await fs.readFile(configFilePath)).toString())
        if(!config.city) {
            console.log('City isn`t setted!')
            const city = await getInput('Enter city: \n')
            await setConfig({city})
        }
        if(!config.apiKey) {
            console.log('Token is not setted')
            const apiKey = await getInput('Enter token: \n')
            await setConfig({apiKey})
        }
        queryParams = new URLSearchParams([['access_key', config.apiKey], ['query', config.city]]).toString()
    } catch (error) {   
        if(error instanceof Error && error.message.split(': ')[0] === 'ENOENT') {
            const city = await getInput('Enter city: \n')
            await setConfig({city})
            const apiKey = await getInput('Enter token: \n')
            await setConfig({apiKey})
            await fs.writeFile(configFilePath, JSON.stringify({ apiKey, city }))
            queryParams = new URLSearchParams([['access_key', apiKey], ['query', city]]).toString()
        }
    }
    await getWeather(queryParams)
}


app()