require('dotenv').config()
import express from 'express'
import { Request, Response} from 'express'
import axios from 'axios'
import * as redis from 'redis'

const app = express()
const port = process.env.PORT || 8080

const BASE_URL = 'https://gnews.io/api/v4'

const tokenAndLanguage = `&token=${process.env.API_TOKEN}&lang=en`

let redisClient : any

const initializeRedis = async () => {
  redisClient = redis.createClient()

  redisClient.on("error", (error: any) => console.error(`Error : ${error}`))

  await redisClient.connect()
}
initializeRedis()

app.get('/api/news/:query', async(req: Request, res: Response) => {
    const query = req.params.query
    const max = req.query.pageSize || 10
    let isCached = false;
    try {
        
        const cacheResults = await redisClient.get(`${query}_${max}`);
        if (cacheResults) {
            isCached = true
            res.send({
                fromCache: true,
                data: JSON.parse(cacheResults)})
          } else {
            await axios({
                method: "get",
                url: `${BASE_URL}/search?q=${query}&max=${max}${tokenAndLanguage}`,
            }).then(async (response) => {
                await redisClient.set(`${query}_${max}`, JSON.stringify(response.data))
                return res.send({
                    fromCache: false,
                    data: response.data})
            })
          }

    } catch (err) {
        console.log(err)
        res.status(500).send({ message: err })
    }
})

app.listen(port, () => {
      console.log({ level: "info", message: `Express is listening at http://localhost:${port}`})
})