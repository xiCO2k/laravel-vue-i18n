<?php

enum Status
{
    case New = 'new';
    case InProgress = 'in_progress';
    case Finished = 'finished';
}

return [
    Status::class => [
        Status::New->value => 'New',
        Status::InProgress->value => 'In Progress',
        Status::Finished->value => 'Finished',
    ],
];
