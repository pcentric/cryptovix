#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { fetchAll } from '@cryptovix/fetcher';
import { buildIndex } from '@cryptovix/core';
import { insertReading, getLatestReading, getReadings } from '@cryptovix/db';

const program = new Command();

/**
 * Renders VIX index as ASCII box display
 */
function renderVixBox(
  value: number,
  change24h: number | null,
  btcPrice: number,
  timestamp: Date,
  deribitIv: number,
  bybitIv: number
): void {
  // Determine color
  let valueColor;
  if (value < 30) {
    valueColor = chalk.green(value.toFixed(2));
  } else if (value <= 50) {
    valueColor = chalk.yellow(value.toFixed(2));
  } else {
    valueColor = chalk.red(value.toFixed(2));
  }

  // Format change
  const changeStr =
    change24h !== null
      ? `${change24h > 0 ? '+' : ''}${change24h.toFixed(1)} (${(change24h / value * 100).toFixed(1)}%)`
      : 'N/A';

  const box = `
╔═══════════════════════════════════════╗
║          CryptoVIX Index              ║
╠═══════════════════════════════════════╣
║  Current Value:    ${String(valueColor).padEnd(17)} ║
║  24h Change:       ${changeStr.padEnd(17)} ║
║  BTC Price:        $${btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }).padEnd(15)} ║
║  Last Updated:     ${timestamp.toLocaleTimeString('en-US', { timeZone: 'UTC' }).padEnd(15)} ║
╠═══════════════════════════════════════╣
║  Deribit IV:       ${deribitIv.toFixed(1).padEnd(17)} ║
║  Bybit IV:         ${bybitIv.toFixed(1).padEnd(17)} ║
╚═══════════════════════════════════════╝
  `;

  console.log(box);
}

/**
 * Command: cryptovix now
 */
program
  .command('now')
  .description('Fetch current CryptoVIX index')
  .action(async () => {
    const spinner = ora('Fetching options data...').start();

    try {
      const options = await fetchAll();
      spinner.text = 'Building index...';

      const result = buildIndex(options);
      insertReading(result);

      spinner.stop();

      // Get previous reading for 24h change
      const now = new Date();
      const day24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const readings = getReadings(day24h);
      const change24h =
        readings.length > 0 ? result.value - readings[readings.length - 1].value : null;

      renderVixBox(
        result.value,
        change24h,
        result.metadata.btcPrice,
        result.timestamp,
        result.components.deribitIv,
        result.components.bybitIv
      );
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

/**
 * Command: cryptovix watch
 */
program
  .command('watch')
  .description('Watch CryptoVIX index with auto-refresh every 30s')
  .action(async () => {
    let isRunning = true;

    const refreshLoop = async () => {
      while (isRunning) {
        const spinner = ora('Fetching options data...').start();

        try {
          const options = await fetchAll();
          spinner.text = 'Building index...';

          const result = buildIndex(options);
          insertReading(result);

          spinner.stop();

          // Clear terminal
          console.clear();

          // Get previous reading for 24h change
          const now = new Date();
          const day24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const readings = getReadings(day24h);
          const change24h =
            readings.length > 0 ? result.value - readings[readings.length - 1].value : null;

          renderVixBox(
            result.value,
            change24h,
            result.metadata.btcPrice,
            result.timestamp,
            result.components.deribitIv,
            result.components.bybitIv
          );

          console.log(chalk.dim('Next refresh in 30 seconds... Press Ctrl+C to stop'));

          // Wait 30 seconds
          await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
        } catch (error) {
          spinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
          await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
        }
      }
    };

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      isRunning = false;
      console.log('\nWatch stopped.');
      process.exit(0);
    });

    await refreshLoop();
  });

/**
 * Command: cryptovix history
 */
program
  .command('history')
  .option('--days <n>', 'Number of days to look back', '7')
  .description('Show historical VIX data')
  .action((options) => {
    const days = parseInt(options.days, 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const readings = getReadings(since);

    if (readings.length === 0) {
      console.log(chalk.yellow('No readings found'));
      return;
    }

    // Print header
    console.log(
      chalk.bold(
        'Timestamp                      Value      BTC Price   Deribit IV   OKX IV   Options'
      )
    );
    console.log(chalk.dim('-'.repeat(85)));

    // Print rows
    for (const reading of readings.reverse()) {
      const timestamp = reading.createdAt || 'N/A';
      const value = reading.value.toFixed(2);
      const btcPrice = (reading.btcPrice || 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      });
      const deribitIv = (reading.deribitIv || 0).toFixed(1);
      const okxIv = (reading.okxIv || 0).toFixed(1);
      const optionsCount = reading.optionsCount || 0;

      console.log(
        `${timestamp.padEnd(30)} ${value.padEnd(10)} ${btcPrice.padEnd(11)} ${deribitIv.padEnd(12)} ${okxIv.padEnd(8)} ${optionsCount}`
      );
    }
  });

program.version('0.1.0').parse();
