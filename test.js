import 'dotenv/config'
import { supabase } from './lib/supabase.js'

const run = async () => {
  // Insert test record
  await supabase.from('players').insert([
    { name: 'Player One', team: 'Team A', points: 15 }
  ])

  // Fetch data
  const { data, error } = await supabase
    .from('players')
    .select('*')

  console.log(data, error)
}

run()
