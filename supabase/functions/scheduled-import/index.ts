import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Import from GIPHY
async function importGiphy(supabase: any, apiKey: string) {
  const results = { imported: 0, skipped: 0, errors: 0 };

  try {
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=pizza&limit=25&rating=pg-13`
    );

    if (!response.ok) throw new Error(`GIPHY: ${response.status}`);

    const data = await response.json();
    const gifs = data.data || [];

    for (const gif of gifs) {
      const mainGif = gif.images?.original || gif.images?.downsized;
      if (!mainGif?.url) continue;

      const { error } = await supabase.from('content').insert({
        type: 'gif',
        title: (gif.title || 'Pizza GIF').replace(/\s*GIF\s*$/i, '').slice(0, 200),
        url: mainGif.url,
        thumbnail_url: gif.images?.fixed_width_still?.url || mainGif.url,
        source_url: gif.url,
        source_platform: 'giphy',
        tags: ['pizza', 'gif', 'giphy'],
        status: 'approved'
      });

      if (error?.code === '23505') results.skipped++;
      else if (error) results.errors++;
      else results.imported++;
    }
  } catch (e) {
    console.error('GIPHY error:', e);
    results.errors++;
  }

  return results;
}

// Import from Reddit
async function importReddit(supabase: any) {
  const results = { imported: 0, skipped: 0, errors: 0 };
  const subreddits = ['pizza', 'pizzacrimes'];

  for (const sub of subreddits) {
    try {
      await delay(1000);

      const response = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=25`,
        { headers: { 'User-Agent': 'pizza-content-bot/1.0' } }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const posts = data.data?.children || [];

      for (const { data: post } of posts) {
        if (!post.url || post.is_self) continue;
        if (!post.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) &&
            !post.url.includes('i.redd.it') &&
            !post.url.includes('i.imgur.com')) continue;

        const isGif = post.url.includes('.gif');

        const { error } = await supabase.from('content').insert({
          type: isGif ? 'gif' : 'meme',
          title: (post.title || 'Reddit Post').slice(0, 200),
          url: post.url,
          thumbnail_url: post.thumbnail?.startsWith('http') ? post.thumbnail : post.url,
          source_url: `https://reddit.com${post.permalink}`,
          source_platform: 'reddit',
          tags: ['pizza', 'reddit', sub],
          status: 'approved'
        });

        if (error?.code === '23505') results.skipped++;
        else if (error) results.errors++;
        else results.imported++;
      }
    } catch (e) {
      console.error(`Reddit r/${sub} error:`, e);
      results.errors++;
    }
  }

  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const giphyKey = Deno.env.get('GIPHY_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      giphy: { imported: 0, skipped: 0, errors: 0 },
      reddit: { imported: 0, skipped: 0, errors: 0 },
      timestamp: new Date().toISOString()
    };

    if (giphyKey) {
      results.giphy = await importGiphy(supabase, giphyKey);
    }

    results.reddit = await importReddit(supabase);

    await supabase.from('import_logs').insert({
      source_id: null,
      status: 'completed',
      items_found: results.giphy.imported + results.giphy.skipped + results.reddit.imported + results.reddit.skipped,
      items_imported: results.giphy.imported + results.reddit.imported,
      items_skipped: results.giphy.skipped + results.reddit.skipped,
      completed_at: new Date().toISOString()
    });

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
